import sys
import os

# Add root directory and backend directory to sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")

for p in [root_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Direct static imports so Vercel's bundler includes backend code
try:
    import backend.app.relocation_solver
    import backend.app.main
    app = backend.app.main.app
except ImportError:
    import app.relocation_solver
    import app.main
    app = app.main.app

