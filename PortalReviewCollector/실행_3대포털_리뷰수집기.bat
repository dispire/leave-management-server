@echo off
chcp 65001 > nul
title 3대 포털 리뷰 수집기 (네이버 · 카카오 · 구글)
cd /d "%~dp0"

echo ========================================================
echo  🌐 3대 포털(네이버·카카오·구글) 리뷰 수집기 실행기
echo ========================================================
echo.

python app_gui.py
if errorlevel 1 (
    echo.
    echo [오류 발생] GUI 실행에 실패했습니다. CLI 모드로 전환합니다.
    python cli_collector.py --interactive
    pause
)
