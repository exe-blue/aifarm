const os = require('os');

/**
 * Calculates CPU usage over a 1-second interval.
 * @returns {Promise<number>} CPU usage percentage.
 */
function getCpuUsage() {
    return new Promise(resolve => {
        const startCpus = os.cpus();

        setTimeout(() => {
            const endCpus = os.cpus();
            let totalIdle = 0;
            let totalTick = 0;

            for (let i = 0; i < endCpus.length; i++) {
                const start = startCpus[i].times;
                const end = endCpus[i].times;

                const idle = end.idle - start.idle;
                const total = (end.user - start.user) + (end.nice - start.nice) + (end.sys - start.sys) + (end.irq - start.irq) + idle;
                
                totalIdle += idle;
                totalTick += total;
            }

            const idlePercent = totalIdle / totalTick;
            const usagePercent = 1 - idlePercent;
            resolve(Math.round(usagePercent * 100));
        }, 1000); // 1-second interval for measurement
    });
}

/**
 * Gathers system statistics like CPU, memory, and uptime.
 * @returns {Promise<object>} An object containing system stats.
 */
async function getSystemStats() {
    const cpu_percent = await getCpuUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memory_percent = Math.round(((totalMem - freeMem) / totalMem) * 100);
    const uptime_hours = os.uptime() / 3600;

    return { cpu_percent, memory_percent, uptime_hours: parseFloat(uptime_hours.toFixed(2)) };
}

module.exports = { getSystemStats };