-- Icon Maker GUI Launcher
-- Run this script to launch the Icon Maker application

set appPath to POSIX path of (path to me)

-- Get the directory containing this script
set scriptDir to do shell script "dirname " & quoted form of appPath

-- Change to the script directory
cd scriptDir

-- Install dependencies if needed
do shell script "pip install -e '.[gui,svg]' 2>/dev/null"

-- Launch the GUI
do shell script "python3 -m icon_maker.gui &"

return "Icon Maker started!"
