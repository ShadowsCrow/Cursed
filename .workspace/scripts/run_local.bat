@echo off
setlocal

set "PROJECT_ROOT=%~dp0..\.."

cd /d "%PROJECT_ROOT%"

if not exist ".venv\Scripts\python.exe" (
  echo Ambiente virtual nao encontrado em .venv
  echo Crie com: py -3 -m venv .venv
  exit /b 1
)

set PYTHONUTF8=1
set STREAMLIT_BROWSER_GATHER_USAGE_STATS=false
set STREAMLIT_SERVER_HEADLESS=false

cd /d "%PROJECT_ROOT%\app_streamlit"
"%PROJECT_ROOT%\.venv\Scripts\python.exe" -m streamlit run app\ficha.py --server.address 127.0.0.1 --server.port 8501
