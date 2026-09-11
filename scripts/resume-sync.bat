@echo off
REM Resumes the two Cloud Scheduler jobs paused by stop-sync.bat. Run this
REM when the next matchday approaches (mid-October for Matchday 2).
REM See PROJECT.md section 6, "Off-season sync pause" for why this exists.

echo Resuming fixtures sync (planKickoffTasks)...
gcloud scheduler jobs resume firebase-schedule-planKickoffTasks-europe-west8 --project=kupatakipucl --location=europe-west8

echo Resuming leaderboard safety net...
gcloud scheduler jobs resume firebase-schedule-recomputeLeaderboardSafetyNet-europe-west8 --project=kupatakipucl --location=europe-west8

echo.
echo Current state:
gcloud scheduler jobs list --project=kupatakipucl --location=europe-west8 --format="table(id,state)"

echo.
echo Done. Normal schedule resumed.
pause
