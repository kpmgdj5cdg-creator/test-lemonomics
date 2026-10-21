from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
with ZipFile('downloads/Lemonade-Lane-Offline.zip', 'w', ZIP_DEFLATED) as archive:
    archive.write('downloads/Lemonade-Lane.html', 'Lemonade-Lane/Lemonade-Lane.html')
    archive.writestr('Lemonade-Lane/READ-ME.txt', 'Open Lemonade-Lane.html in Chrome, Edge, or Firefox. No installation or Internet connection is required. Progress saves in browser storage at the same file location. Back up saved games before clearing browser data. Live daily market pricing requires a separate hosted pricing service. See the repository README for development and release checks.\n')
print('Built standalone HTML and offline ZIP')
