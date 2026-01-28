import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.main import app
# Vercel expects a handler; expose the ASGI app
handler = app
