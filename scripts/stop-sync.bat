@echo off
REM Pauses the two Cloud Scheduler jobs behind football-data.org sync and the
REM leaderboard safety-net recompute. Zero code involved - this is plain
REM gcloud scheduler pause, nothing runs again until resume-sync.bat is run.
REM See PROJECT.md section 6, "Off-season sync pause" for why this exists.

echo Pausing fixtures sync (planKickoffTasks)...
gcloud scheduler jobs pause firebase-schedule-planKickoffTasks-europe-west8 --project=kupatakipucl --location=europe-west8

echo Pausing leaderboard safety net...
gcloud scheduler jobs pause firebase-schedule-recomputeLeaderboardSafetyNet-europe-west8 --project=kupatakipucl --location=europe-west8

echo.
echo Current state:
gcloud scheduler jobs list --project=kupatakipucl --location=europe-west8 --format="table(id,state)"

echo.
echo Done. Nothing will run until resume-sync.bat is run.
pause
