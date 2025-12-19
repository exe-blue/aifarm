"""Google Sheets 데이터 로더"""

import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

from src.data.base_loader import DataLoader
from src.modules.task_registry import TaskConfig
from src.core.exceptions import DataLoadError, AuthenticationError

logger = logging.getLogger(__name__)


class GoogleSheetLoader(DataLoader):
    """
    Google Sheets 데이터 로더
    
    Google Sheets API를 사용하여 태스크 데이터를 로드합니다.
    """
    
    def __init__(self, credentials_path: str):
        """
        Args:
            credentials_path: Google 서비스 계정 JSON 키 파일 경로
        """
        self.credentials_path = credentials_path
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Google Sheets 클라이언트 초기화"""
        try:
            import gspread
            from google.oauth2.service_account import Credentials
            
            if not Path(self.credentials_path).exists():
                logger.warning(f"Credentials file not found: {self.credentials_path}")
                return
            
            scopes = [
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"
            ]
            
            creds = Credentials.from_service_account_file(
                self.credentials_path,
                scopes=scopes
            )
            self.client = gspread.authorize(creds)
            logger.info("Google Sheets client initialized")
            
        except ImportError:
            logger.warning("gspread not installed. Run: pip install gspread google-auth")
        except Exception as e:
            logger.error(f"Failed to initialize Google Sheets client: {e}")
            raise AuthenticationError(f"Google Sheets authentication failed: {e}")
    
    def get_worksheet(self, sheet_url: str, worksheet_name: str = "Sheet1"):
        """
        워크시트 객체 가져오기
        
        Args:
            sheet_url: Google Sheets URL
            worksheet_name: 워크시트 이름
            
        Returns:
            gspread Worksheet 객체
        """
        if not self.client:
            raise DataLoadError("Google Sheets client not initialized")
        
        try:
            sheet = self.client.open_by_url(sheet_url)
            return sheet.worksheet(worksheet_name)
        except Exception as e:
            raise DataLoadError(f"Failed to open worksheet: {e}")
    
    def load_sheet_data(
        self,
        sheet_url: str,
        worksheet_name: str = "Sheet1"
    ) -> List[Dict[str, Any]]:
        """
        시트에서 데이터 로드 (동기)
        
        Args:
            sheet_url: Google Sheets URL
            worksheet_name: 워크시트 이름
            
        Returns:
            딕셔너리 리스트
        """
        worksheet = self.get_worksheet(sheet_url, worksheet_name)
        records = worksheet.get_all_records()
        logger.info(f"Loaded {len(records)} records from {worksheet_name}")
        return records
    
    async def load_raw_data(self) -> List[Dict[str, Any]]:
        """
        원시 데이터 로드 (비동기 인터페이스)
        
        Note: 실제로는 동기 호출을 래핑
        """
        # 서브클래스에서 sheet_url과 worksheet_name을 설정해야 함
        raise NotImplementedError("Subclass must implement load_raw_data with sheet URL")
    
    async def load_tasks(self) -> List[TaskConfig]:
        """
        태스크 설정 로드 (비동기 인터페이스)
        """
        raw_data = await self.load_raw_data()
        return [self.parse_task_config(data) for data in raw_data]
    
    def load_keywords(
        self,
        sheet_url: str,
        worksheet_name: str = "keywords",
        column_name: str = "keyword"
    ) -> List[str]:
        """
        키워드 목록 로드
        
        Args:
            sheet_url: Google Sheets URL
            worksheet_name: 워크시트 이름
            column_name: 키워드 컬럼 이름
            
        Returns:
            키워드 리스트
        """
        records = self.load_sheet_data(sheet_url, worksheet_name)
        return [r[column_name] for r in records if r.get(column_name)]
    
    def load_comments(
        self,
        sheet_url: str,
        worksheet_name: str = "comments",
        column_name: str = "comment"
    ) -> List[str]:
        """
        댓글 목록 로드
        
        Args:
            sheet_url: Google Sheets URL
            worksheet_name: 워크시트 이름
            column_name: 댓글 컬럼 이름
            
        Returns:
            댓글 리스트
        """
        records = self.load_sheet_data(sheet_url, worksheet_name)
        return [r[column_name] for r in records if r.get(column_name)]
    
    def write_results(
        self,
        sheet_url: str,
        worksheet_name: str,
        data: List[Dict[str, Any]]
    ):
        """
        결과 데이터 시트에 쓰기
        
        Args:
            sheet_url: Google Sheets URL
            worksheet_name: 워크시트 이름
            data: 쓸 데이터 리스트
        """
        if not data:
            return
        
        worksheet = self.get_worksheet(sheet_url, worksheet_name)
        
        # 헤더
        headers = list(data[0].keys())
        
        # 데이터 행
        rows = [headers] + [[str(row.get(h, "")) for h in headers] for row in data]
        
        # 쓰기
        worksheet.clear()
        worksheet.update("A1", rows)
        logger.info(f"Wrote {len(data)} records to {worksheet_name}")


class YouTubeSheetLoader(GoogleSheetLoader):
    """YouTube 태스크용 시트 로더"""
    
    def __init__(
        self,
        credentials_path: str,
        sheet_url: str,
        keywords_worksheet: str = "keywords",
        comments_worksheet: str = "comments"
    ):
        super().__init__(credentials_path)
        self.sheet_url = sheet_url
        self.keywords_worksheet = keywords_worksheet
        self.comments_worksheet = comments_worksheet
    
    async def load_raw_data(self) -> List[Dict[str, Any]]:
        """YouTube 설정 데이터 로드"""
        return self.load_sheet_data(self.sheet_url, self.keywords_worksheet)
    
    def load_youtube_config(self) -> Dict[str, Any]:
        """
        YouTube 태스크 설정 로드
        
        Returns:
            {keywords, comments, ...} 딕셔너리
        """
        keywords = self.load_keywords(
            self.sheet_url,
            self.keywords_worksheet
        )
        
        comments = self.load_comments(
            self.sheet_url,
            self.comments_worksheet
        )
        
        return {
            "keywords": keywords,
            "comments": comments
        }

