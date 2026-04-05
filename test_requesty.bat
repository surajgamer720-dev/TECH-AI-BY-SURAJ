@echo off
REM OpenRouter AI Test Script
REM Load environment variables from .env if it exists
if exist .env (
  for /f "tokens=*" %%i in (.env) do set %%i
)

REM Check if API key is set
if "%VITE_OPENROUTER_API_KEY%"=="" (
  echo Error: VITE_OPENROUTER_API_KEY not set. Please set it in .env file.
  pause
  exit /b 1
)

REM Run the curl command
curl https://openrouter.ai/api/v1/chat/completions ^
  -H "Authorization: Bearer %VITE_OPENROUTER_API_KEY%" ^
  -H "HTTP-Referer: http://localhost:5173" ^
  -H "X-OpenRouter-Title: Requesty Chat Agent" ^
  -H "Content-Type: application/json" ^
  -d "{\"model\": \"google/gemini-2.5-flash-lite\", \"messages\": [{\"role\": \"user\", \"content\": [{\"type\": \"text\", \"text\": \"Hello from OpenRouter!\"}]}]}"

pause