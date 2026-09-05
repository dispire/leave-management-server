@echo off
title AuthorDuplicateFinder
echo ========================================================
echo   [AuthorDuplicateFinder] 폴더 간 작가명 중복 검색 프로그램
echo ========================================================
echo.
echo 프로그램 GUI 화면을 시작하는 중입니다...

python "%~dp0app_gui.py"

if errorlevel 1 (
    echo.
    echo [오류] 파이썬 프로그램 실행에 실패했습니다.
    echo python 환경이 설치되어 있는지 확인해주세요.
    pause
)
