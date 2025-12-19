'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Settings2, 
  ArrowLeft,
  Save,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ACTIVITY_CONFIG } from '@/data/constants';
import type { ActivityType } from '@/types';

interface ActivitySettings {
  id: ActivityType;
  is_enabled: boolean;
  allocated_devices: number;
  success_probability: number;
  interval_minutes: number;
}

// 모의 설정 데이터
const initialSettings: ActivitySettings[] = [
  {
    id: 'shorts_remix',
    is_enabled: true,
    allocated_devices: 120,
    success_probability: 94,
    interval_minutes: 15,
  },
  {
    id: 'playlist_curator',
    is_enabled: true,
    allocated_devices: 80,
    success_probability: 91,
    interval_minutes: 30,
  },
  {
    id: 'persona_commenter',
    is_enabled: true,
    allocated_devices: 100,
    success_probability: 88,
    interval_minutes: 20,
  },
  {
    id: 'trend_scout',
    is_enabled: true,
    allocated_devices: 60,
    success_probability: 96,
    interval_minutes: 45,
  },
  {
    id: 'challenge_hunter',
    is_enabled: true,
    allocated_devices: 40,
    success_probability: 89,
    interval_minutes: 60,
  },
  {
    id: 'thumbnail_lab',
    is_enabled: false,
    allocated_devices: 23,
    success_probability: 92,
    interval_minutes: 120,
  },
];

export default function IdleSettingsPage() {
  const [settings, setSettings] = useState<ActivitySettings[]>(initialSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const totalAllocated = settings.reduce((sum, s) => sum + (s.is_enabled ? s.allocated_devices : 0), 0);
  const MAX_DEVICES = 600;

  const updateSetting = (id: ActivityType, updates: Partial<ActivitySettings>) => {
    setSettings(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // 실제로는 API 호출
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/idle">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-purple-400" />
              활동 설정
            </h1>
            <p className="text-zinc-400 text-sm">유휴 활동별 할당 및 확률 설정</p>
          </div>
        </div>
        <Button 
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          저장
        </Button>
      </div>

      {/* 전체 할당 현황 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white">전체 할당 현황</h3>
              <p className="text-sm text-zinc-400">활성화된 활동에 할당된 총 디바이스 수</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${totalAllocated > MAX_DEVICES ? 'text-red-400' : 'text-cyan-400'}`}>
                {totalAllocated} / {MAX_DEVICES}
              </p>
              {totalAllocated > MAX_DEVICES && (
                <p className="text-xs text-red-400">최대 할당량 초과!</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 활동별 설정 */}
      <div className="space-y-4">
        {settings.map((setting) => {
          const config = ACTIVITY_CONFIG[setting.id];
          
          return (
            <Card key={setting.id} className={`bg-zinc-900 border-zinc-800 ${!setting.is_enabled ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <CardTitle className={config.color}>{config.name}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </div>
                  <Switch 
                    checked={setting.is_enabled}
                    onCheckedChange={(checked) => updateSetting(setting.id, { is_enabled: checked })}
                  />
                </div>
              </CardHeader>
              
              {setting.is_enabled && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 할당 디바이스 */}
                    <div className="space-y-2">
                      <Label>할당 디바이스 수</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={setting.allocated_devices}
                          onChange={(e) => updateSetting(setting.id, { 
                            allocated_devices: Math.max(0, parseInt(e.target.value) || 0) 
                          })}
                          className="w-24"
                          min={0}
                          max={MAX_DEVICES}
                        />
                        <span className="text-sm text-zinc-400">대</span>
                      </div>
                    </div>
                    
                    {/* 성공 확률 */}
                    <div className="space-y-2">
                      <Label>목표 성공률</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={setting.success_probability}
                          onChange={(e) => updateSetting(setting.id, { 
                            success_probability: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) 
                          })}
                          className="w-24"
                          min={0}
                          max={100}
                        />
                        <span className="text-sm text-zinc-400">%</span>
                      </div>
                    </div>
                    
                    {/* 실행 간격 */}
                    <div className="space-y-2">
                      <Label>실행 간격</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={setting.interval_minutes}
                          onChange={(e) => updateSetting(setting.id, { 
                            interval_minutes: Math.max(1, parseInt(e.target.value) || 1) 
                          })}
                          className="w-24"
                          min={1}
                        />
                        <span className="text-sm text-zinc-400">분</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
