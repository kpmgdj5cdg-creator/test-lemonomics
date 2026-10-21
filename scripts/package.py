"""Package deterministic offline downloads; source stays outside the player ZIP."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

readme = (
    'Open Lemonade-Lane.html in Chrome, Edge, or Firefox. No installation or '
    'Internet connection is required. Progress saves in browser storage at the '
    'same file location. Keep that location to retain an existing save.\n\n'
    'Playability update: Downtown bookstore and Maple Market, decimal recipes, '
    'financial Excel exports, Results & Projections, investment-backed loans, '
    'early loan payoff, and business closure/restart. All four voxel locations '
    'and avatar controls are retained.\n\n'
    'Start with Bank > Loans, withdraw checking funds, enter a recipe, and buy '
    'supplies. Good/Better/Best recipe bonuses require ownership and an exact match. '
    'Investment-backed loans are limited to 50% of portfolio value, capped at '
    '$10,000. Live daily market pricing requires a separate hosted pricing service. '
    'See the repository README for financial rules and development checks.\n'
)
with ZipFile('downloads/Lemonade-Lane-Offline.zip', 'w', ZIP_DEFLATED) as archive:
    for name, data in [
        ('Lemonade-Lane/Lemonade-Lane.html', Path('downloads/Lemonade-Lane.html').read_bytes()),
        ('Lemonade-Lane/READ-ME.txt', readme.encode()),
    ]:
        entry = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        entry.compress_type = ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        archive.writestr(entry, data)
print('Built standalone HTML and deterministic offline ZIP')
