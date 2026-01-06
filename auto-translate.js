const fs = require('fs');
const https = require('https');

// 환경 변수에서 API 키 로드 (필수)
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
    console.error("Error: OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.");
    console.error("사용법: OPENAI_API_KEY=sk-xxx node auto-translate.js <input.json> <output.json>");
    process.exit(1);
}

const TARGET_LANG = "Korean";

async function translate(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Skip if already Korean (simple check)
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) return text;

    console.log(`Translating: "${text.substring(0, 30)}..."`);

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a professional UI translator for a software dashboard. Translate the following English text to natural ${TARGET_LANG}. Maintain the tone, formatting, and any variables (like {name}). Return ONLY the translated text.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            temperature: 0.3
        });

        const req = https.request({
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.choices[0].message.content.trim());
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`OpenAI API Error: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function traverseAndTranslate(obj) {
    if (typeof obj === 'string') {
        return await translate(obj);
    } else if (Array.isArray(obj)) {
        return await Promise.all(obj.map(item => traverseAndTranslate(item)));
    } else if (typeof obj === 'object' && obj !== null) {
        const newObj = {};
        for (const key in obj) {
            newObj[key] = await traverseAndTranslate(obj[key]);
        }
        return newObj;
    }
    return obj;
}

async function main() {
    const inputFile = process.argv[2];
    const outputFile = process.argv[3];

    if (!inputFile || !outputFile) {
        console.log("Usage: node auto-translate.js <input.json> <output.json>");
        process.exit(1);
    }

    try {
        if (!fs.existsSync(inputFile)) {
            console.error(`Input file not found: ${inputFile}`);
            process.exit(1);
        }

        const content = fs.readFileSync(inputFile, 'utf8');
        const json = JSON.parse(content);
        
        console.log(`Reading from ${inputFile}...`);
        const translated = await traverseAndTranslate(json);
        
        fs.writeFileSync(outputFile, JSON.stringify(translated, null, 2), 'utf8');
        console.log(`✅ Translation saved to ${outputFile}`);
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}

main();