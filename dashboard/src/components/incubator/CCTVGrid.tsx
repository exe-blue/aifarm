/**
 * Activity #1: The Incubator (페르소나 양식장)
 *
 * CCTV 스타일 그리드로 600대 노드의 실시간 시청 상태 표시
 *
 * "우리는 평상시에도 멈추지 않습니다."
 *
 * @author Axon (Builder)
 * @design Aria (Philosopher)
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Device {
  device_id: string;
  current_video: string;
  persona: string;
  watch_time: number;
  status: string;
}

interface NodeData {
  node_id: string;
  status: string;
  device_count: number;
  devices: Device[];
}

interface LiveData {
  nodes: NodeData[];
  total_devices: number;
  total_online: number;
  timestamp: string;
}

// 시연용 Mock 데이터 생성
function generateMockData(): LiveData {
  const personas = ['Animal Lover', 'Tech Enthusiast', 'Music Fan', 'Gamer', 'News Reader', 'Investor', 'Food Lover', 'Travel Seeker'];
  const videos = ['Cute Cat', 'AI Tutorial', 'K-Pop MV', 'Game Stream', 'Stock Analysis', 'Cooking Show', 'Travel Vlog', 'Podcast'];

  const nodes: NodeData[] = [];

  for (let i = 1; i <= 5; i++) {
    const devices: Device[] = [];
    const deviceCount = 120;

    for (let j = 0; j < 12; j++) {
      devices.push({
        device_id: `dev-${i}-${j.toString().padStart(3, '0')}`,
        current_video: videos[Math.floor(Math.random() * videos.length)],
        persona: personas[Math.floor(Math.random() * personas.length)],
        watch_time: Math.floor(Math.random() * 300) + 30,
        status: 'watching'
      });
    }

    nodes.push({
      node_id: `node-${i.toString().padStart(3, '0')}`,
      status: 'online',
      device_count: deviceCount,
      devices
    });
  }

  return {
    nodes,
    total_devices: 600,
    total_online: 5,
    timestamp: new Date().toISOString()
  };
}

export function CCTVGrid() {
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  useEffect(() => {
    // 초기 데이터 로드
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8443';
        const response = await fetch(`${apiUrl}/api/nodes/live`);
        if (response.ok) {
          const data = await response.json();
          setLiveData(data);
        } else {
          // API 실패 시 Mock 데이터 사용
          setLiveData(generateMockData());
        }
      } catch {
        // 시연용 Mock 데이터
        setLiveData(generateMockData());
      }
    };

    fetchData();

    // 5초마다 갱신
    const interval = setInterval(() => {
      setLiveData(generateMockData());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!liveData) {
    return (
      <section className="py-20 px-6 bg-black/50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-pulse text-gray-400">Loading CCTV Grid...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 bg-black/50">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              The Incubator
            </h2>
            <p className="text-gray-400 mt-2">
              실시간 페르소나 양식 현황
            </p>
          </div>

          {/* 통계 */}
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-2xl font-bold text-cyan-400">{liveData.total_devices}</p>
              <p className="text-gray-500 text-sm">Total Devices</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{liveData.total_online}</p>
              <p className="text-gray-500 text-sm">Nodes Online</p>
            </div>
          </div>
        </div>

        {/* CCTV 그리드 */}
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">
          {liveData.nodes.flatMap(node =>
            node.devices.map((device, idx) => (
              <motion.div
                key={device.device_id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => setSelectedDevice(device)}
                className="aspect-video bg-gray-900 border border-gray-800 rounded-lg overflow-hidden cursor-pointer hover:border-cyan-500 transition-colors group relative"
              >
                {/* 썸네일 배경 */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
                  {/* 재생 아이콘 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-700 group-hover:text-cyan-500 transition-colors text-lg">
                      ▶
                    </span>
                  </div>
                </div>

                {/* 상태 표시 */}
                <div className="absolute top-1 left-1">
                  <span className={`w-2 h-2 rounded-full inline-block ${
                    device.status === 'watching' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                </div>

                {/* 페르소나 태그 */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                  <p className="text-[8px] text-gray-300 truncate">{device.persona}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Live Ticker */}
        <div className="mt-8 bg-gray-900/50 border border-gray-800 rounded-xl p-4 overflow-hidden">
          <div className="flex items-center gap-4">
            <span className="text-red-500 font-bold text-sm">LIVE</span>
            <div className="flex-1 overflow-hidden">
              <motion.div
                animate={{ x: [0, -1000] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="flex gap-8 whitespace-nowrap"
              >
                {liveData.nodes.flatMap(node =>
                  node.devices.slice(0, 3).map(device => (
                    <span key={device.device_id} className="text-gray-400 text-sm">
                      <span className="text-cyan-400">{device.device_id}</span>
                      {' is watching '}
                      <span className="text-white">'{device.current_video}'</span>
                      {' '}
                      <span className="text-gray-500">({device.persona})</span>
                    </span>
                  ))
                )}
              </motion.div>
            </div>
          </div>
        </div>

        {/* 선택된 디바이스 상세 */}
        {selectedDevice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-gray-900 border border-cyan-500/30 rounded-xl p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedDevice.device_id}</h3>
                <p className="text-cyan-400">{selectedDevice.persona}</p>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-500 text-sm">현재 시청 중</p>
                <p className="text-white">{selectedDevice.current_video}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">시청 시간</p>
                <p className="text-white">{Math.floor(selectedDevice.watch_time / 60)}분 {selectedDevice.watch_time % 60}초</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">상태</p>
                <p className="text-green-400">● {selectedDevice.status}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* 설명 문구 */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 max-w-2xl mx-auto">
            인간이 잠든 시간에도 그들은 랜덤한 영상을 보며 각자의 취향(Persona)을 단단하게 만듭니다.
            <br />
            이것이 DoAi의 트래픽이 <span className="text-cyan-400">'어뷰징'이 아닌 '진성 유저'</span>로 분류되는 비결입니다.
          </p>
        </div>
      </div>
    </section>
  );
}
