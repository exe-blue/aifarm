"""트렌드 태스크 디스패처

600대 디바이스에 트렌드 분석 태스크를 분배합니다.
- 태스크 타입별 디바이스 할당
- 로드 밸런싱
- 실패 복구
"""

import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import random

logger = logging.getLogger(__name__)


class TaskType(Enum):
    """태스크 타입 정의"""
    SEARCH_ANALYSIS = 'search_analysis'        # 검색 결과 분석
    CHANNEL_TRACKING = 'channel_tracking'      # 채널 구독자 추적
    COMMENT_COLLECTION = 'comment_collection'  # 댓글 수집
    RECOMMENDATION_PATH = 'recommendation_path' # 추천 경로 추적
    AD_PATTERN = 'ad_pattern'                  # 광고 패턴 수집
    THUMBNAIL_ANALYSIS = 'thumbnail_analysis'  # 썸네일 분석


# 태스크 타입별 기본 할당 비율
DEFAULT_ALLOCATION = {
    TaskType.SEARCH_ANALYSIS: 100,      # 100대
    TaskType.CHANNEL_TRACKING: 100,     # 100대
    TaskType.COMMENT_COLLECTION: 100,   # 100대
    TaskType.RECOMMENDATION_PATH: 100,  # 100대
    TaskType.AD_PATTERN: 100,           # 100대
    TaskType.THUMBNAIL_ANALYSIS: 100,   # 100대
}


@dataclass
class TaskAssignment:
    """태스크 할당 정보"""
    device_ip: str
    device_number: int
    task_type: TaskType
    task_params: Dict[str, Any]
    priority: int = 1
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str = 'pending'  # pending, running, completed, failed
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@dataclass
class DeviceGroup:
    """디바이스 그룹"""
    task_type: TaskType
    device_ips: List[str]
    device_numbers: List[int]
    start_index: int
    end_index: int


class TrendDispatcher:
    """
    트렌드 태스크 디스패처
    
    600대 디바이스에 트렌드 분석 태스크를 효율적으로 분배합니다.
    """
    
    def __init__(
        self,
        device_subnet: str = '10.0.10',
        total_devices: int = 600,
        allocation: Optional[Dict[TaskType, int]] = None
    ):
        """
        Args:
            device_subnet: 디바이스 서브넷 (예: '10.0.10')
            total_devices: 총 디바이스 수
            allocation: 태스크 타입별 할당 수
        """
        self.device_subnet = device_subnet
        self.total_devices = total_devices
        self.allocation = allocation or DEFAULT_ALLOCATION.copy()
        
        # 디바이스 그룹 초기화
        self._device_groups: Dict[TaskType, DeviceGroup] = {}
        self._assignments: Dict[str, TaskAssignment] = {}
        self._initialize_device_groups()
    
    def _initialize_device_groups(self):
        """디바이스 그룹 초기화"""
        start_idx = 1
        
        for task_type, count in self.allocation.items():
            end_idx = min(start_idx + count - 1, self.total_devices)
            
            device_ips = [
                f"{self.device_subnet}.{i}" 
                for i in range(start_idx, end_idx + 1)
            ]
            device_numbers = list(range(start_idx, end_idx + 1))
            
            self._device_groups[task_type] = DeviceGroup(
                task_type=task_type,
                device_ips=device_ips,
                device_numbers=device_numbers,
                start_index=start_idx,
                end_index=end_idx
            )
            
            logger.info(f"디바이스 그룹 생성: {task_type.value} - {start_idx}~{end_idx}번 ({len(device_ips)}대)")
            start_idx = end_idx + 1
    
    # ==================== 태스크 할당 ====================
    
    def assign_keyword_analysis(
        self,
        keyword: str,
        depth: int = 1
    ) -> List[TaskAssignment]:
        """
        키워드 분석 태스크 분배
        
        Args:
            keyword: 분석할 키워드
            depth: 분석 깊이 (1-10)
            
        Returns:
            TaskAssignment 리스트
        """
        assignments = []
        
        # 검색 분석 태스크
        search_group = self._device_groups.get(TaskType.SEARCH_ANALYSIS)
        if search_group:
            for i, (device_ip, device_num) in enumerate(zip(
                search_group.device_ips[:depth * 10],
                search_group.device_numbers[:depth * 10]
            )):
                assignment = TaskAssignment(
                    device_ip=device_ip,
                    device_number=device_num,
                    task_type=TaskType.SEARCH_ANALYSIS,
                    task_params={
                        'keyword': keyword,
                        'search_position': i + 1,
                        'max_results': 10
                    }
                )
                assignments.append(assignment)
                self._assignments[f"{device_ip}:{keyword}:search"] = assignment
        
        # 댓글 수집 태스크
        comment_group = self._device_groups.get(TaskType.COMMENT_COLLECTION)
        if comment_group:
            for device_ip, device_num in zip(
                comment_group.device_ips[:depth * 10],
                comment_group.device_numbers[:depth * 10]
            ):
                assignment = TaskAssignment(
                    device_ip=device_ip,
                    device_number=device_num,
                    task_type=TaskType.COMMENT_COLLECTION,
                    task_params={
                        'keyword': keyword,
                        'max_comments': 100
                    }
                )
                assignments.append(assignment)
                self._assignments[f"{device_ip}:{keyword}:comment"] = assignment
        
        logger.info(f"키워드 '{keyword}' 분석 태스크 {len(assignments)}건 할당")
        return assignments
    
    def assign_video_analysis(
        self,
        video_id: str,
        video_title: str
    ) -> List[TaskAssignment]:
        """
        영상 분석 태스크 분배
        
        Args:
            video_id: 영상 ID
            video_title: 영상 제목
            
        Returns:
            TaskAssignment 리스트
        """
        assignments = []
        
        # 댓글 수집 (20대)
        comment_group = self._device_groups.get(TaskType.COMMENT_COLLECTION)
        if comment_group:
            for device_ip, device_num in zip(
                comment_group.device_ips[:20],
                comment_group.device_numbers[:20]
            ):
                assignment = TaskAssignment(
                    device_ip=device_ip,
                    device_number=device_num,
                    task_type=TaskType.COMMENT_COLLECTION,
                    task_params={
                        'video_id': video_id,
                        'video_title': video_title,
                        'max_comments': 50
                    }
                )
                assignments.append(assignment)
        
        # 추천 경로 추적 (20대)
        rec_group = self._device_groups.get(TaskType.RECOMMENDATION_PATH)
        if rec_group:
            for device_ip, device_num in zip(
                rec_group.device_ips[:20],
                rec_group.device_numbers[:20]
            ):
                assignment = TaskAssignment(
                    device_ip=device_ip,
                    device_number=device_num,
                    task_type=TaskType.RECOMMENDATION_PATH,
                    task_params={
                        'video_id': video_id,
                        'video_title': video_title,
                        'track_depth': 3
                    }
                )
                assignments.append(assignment)
        
        logger.info(f"영상 '{video_id}' 분석 태스크 {len(assignments)}건 할당")
        return assignments
    
    def assign_channel_tracking(
        self,
        channel_ids: List[str]
    ) -> List[TaskAssignment]:
        """
        채널 추적 태스크 분배
        
        Args:
            channel_ids: 채널 ID 리스트
            
        Returns:
            TaskAssignment 리스트
        """
        assignments = []
        
        channel_group = self._device_groups.get(TaskType.CHANNEL_TRACKING)
        if not channel_group:
            return assignments
        
        # 채널별로 디바이스 할당
        for i, channel_id in enumerate(channel_ids):
            device_idx = i % len(channel_group.device_ips)
            device_ip = channel_group.device_ips[device_idx]
            device_num = channel_group.device_numbers[device_idx]
            
            assignment = TaskAssignment(
                device_ip=device_ip,
                device_number=device_num,
                task_type=TaskType.CHANNEL_TRACKING,
                task_params={
                    'channel_id': channel_id
                }
            )
            assignments.append(assignment)
        
        logger.info(f"채널 {len(channel_ids)}개 추적 태스크 할당")
        return assignments
    
    def assign_full_trend_analysis(
        self,
        keyword: str,
        depth: int = 5
    ) -> Dict[TaskType, List[TaskAssignment]]:
        """
        전체 트렌드 분석 태스크 분배 (모든 태스크 타입)
        
        Args:
            keyword: 분석할 키워드
            depth: 분석 깊이
            
        Returns:
            {TaskType: [TaskAssignment]} 딕셔너리
        """
        all_assignments: Dict[TaskType, List[TaskAssignment]] = {}
        devices_per_type = depth * 10  # 깊이당 10대
        
        for task_type, group in self._device_groups.items():
            assignments = []
            
            for i, (device_ip, device_num) in enumerate(zip(
                group.device_ips[:devices_per_type],
                group.device_numbers[:devices_per_type]
            )):
                assignment = TaskAssignment(
                    device_ip=device_ip,
                    device_number=device_num,
                    task_type=task_type,
                    task_params={
                        'keyword': keyword,
                        'position': i + 1,
                        'depth': depth
                    }
                )
                assignments.append(assignment)
            
            all_assignments[task_type] = assignments
        
        total = sum(len(a) for a in all_assignments.values())
        logger.info(f"전체 트렌드 분석 '{keyword}' - 총 {total}건 태스크 할당")
        return all_assignments
    
    # ==================== 상태 관리 ====================
    
    def start_assignment(self, assignment: TaskAssignment):
        """태스크 시작"""
        assignment.status = 'running'
        assignment.started_at = datetime.now()
    
    def complete_assignment(self, assignment: TaskAssignment, result: Dict[str, Any]):
        """태스크 완료"""
        assignment.status = 'completed'
        assignment.completed_at = datetime.now()
        assignment.result = result
    
    def fail_assignment(self, assignment: TaskAssignment, error: str):
        """태스크 실패"""
        assignment.status = 'failed'
        assignment.completed_at = datetime.now()
        assignment.error = error
    
    def get_pending_assignments(self, task_type: Optional[TaskType] = None) -> List[TaskAssignment]:
        """대기 중인 태스크 조회"""
        assignments = [a for a in self._assignments.values() if a.status == 'pending']
        
        if task_type:
            assignments = [a for a in assignments if a.task_type == task_type]
        
        return assignments
    
    def get_running_assignments(self) -> List[TaskAssignment]:
        """실행 중인 태스크 조회"""
        return [a for a in self._assignments.values() if a.status == 'running']
    
    def get_stats(self) -> Dict[str, Any]:
        """디스패처 통계"""
        all_assignments = list(self._assignments.values())
        
        return {
            'total_devices': self.total_devices,
            'device_groups': {
                task_type.value: {
                    'count': len(group.device_ips),
                    'range': f"{group.start_index}-{group.end_index}"
                }
                for task_type, group in self._device_groups.items()
            },
            'assignments': {
                'total': len(all_assignments),
                'pending': len([a for a in all_assignments if a.status == 'pending']),
                'running': len([a for a in all_assignments if a.status == 'running']),
                'completed': len([a for a in all_assignments if a.status == 'completed']),
                'failed': len([a for a in all_assignments if a.status == 'failed'])
            }
        }
    
    def clear_assignments(self):
        """할당 초기화"""
        self._assignments.clear()
        logger.info("태스크 할당 초기화 완료")
    
    # ==================== 유틸리티 ====================
    
    def get_device_group(self, task_type: TaskType) -> Optional[DeviceGroup]:
        """태스크 타입별 디바이스 그룹 조회"""
        return self._device_groups.get(task_type)
    
    def get_random_device(self, task_type: TaskType) -> Optional[str]:
        """랜덤 디바이스 IP 반환"""
        group = self._device_groups.get(task_type)
        if group and group.device_ips:
            return random.choice(group.device_ips)
        return None
    
    def rebalance_allocation(self, new_allocation: Dict[TaskType, int]):
        """할당 재조정"""
        self.allocation = new_allocation
        self._device_groups.clear()
        self._initialize_device_groups()
        logger.info("디바이스 할당 재조정 완료")
