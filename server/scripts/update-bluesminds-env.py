#!/usr/bin/env python3
"""Update Bluesminds env vars in server/.env without printing secrets."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parent.parent / '.env'

UPDATES = {
    'BLUESMINDS_API_KEY': os.environ.get('BLUESMINDS_API_KEY', '').strip(),
    'BLUESMINDS_MODEL': os.environ.get('BLUESMINDS_MODEL', 'gpt-5.4').strip(),
    'BLUESMINDS_BASE_URL': os.environ.get('BLUESMINDS_BASE_URL', 'https://api.bluesminds.com/v1').strip(),
    'BLUESMINDS_TIMEOUT_MS': os.environ.get('BLUESMINDS_TIMEOUT_MS', '120000').strip(),
}


def main() -> int:
    if not UPDATES['BLUESMINDS_API_KEY']:
        print('BLUESMINDS_API_KEY env var required', file=sys.stderr)
        return 1

    if not ENV_PATH.exists():
        print(f'Missing {ENV_PATH}', file=sys.stderr)
        return 1

    lines = ENV_PATH.read_text().splitlines()
    seen = set()
    out = []

    for line in lines:
        if '=' not in line or line.strip().startswith('#'):
            out.append(line)
            continue
        key, _ = line.split('=', 1)
        if key in UPDATES:
            out.append(f'{key}={UPDATES[key]}')
            seen.add(key)
        else:
            out.append(line)

    for key, value in UPDATES.items():
        if key not in seen:
            out.append(f'{key}={value}')

    ENV_PATH.write_text('\n'.join(out) + '\n')
    print('Updated Bluesminds settings in .env')
    print(f"  BLUESMINDS_MODEL={UPDATES['BLUESMINDS_MODEL']}")
    print(f"  BLUESMINDS_TIMEOUT_MS={UPDATES['BLUESMINDS_TIMEOUT_MS']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
