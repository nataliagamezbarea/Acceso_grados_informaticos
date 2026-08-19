#!/usr/bin/env python3
import os, re

env_path = os.path.join(os.path.dirname(__file__), ".env")
env_vars = {}

if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                env_vars[key.strip()] = val.strip()

supabase_url  = os.environ.get("SUPABASE_URL") or env_vars.get("SUPABASE_URL", "")
supabase_key  = os.environ.get("SUPABASE_ANON_KEY") or env_vars.get("SUPABASE_ANON_KEY", "")
gh_repo       = os.environ.get("GH_REPO") or env_vars.get("GH_REPO", "nataliagamezbarea/Acceso_grados_informaticos")
gh_token      = os.environ.get("GH_TOKEN") or env_vars.get("GH_TOKEN", "")
suffix        = os.environ.get("CONFIG_SUFFIX") or env_vars.get("CONFIG_SUFFIX", "local")

js_dir = os.path.join(os.path.dirname(__file__), "js")
os.makedirs(js_dir, exist_ok=True)

# Borrar archivos de config antiguos
for f in os.listdir(js_dir):
    if f.startswith("SUPABASETOKEN_") or f.startswith("GITHUBTOKEN_") \
       or f in ("supabase-config.js", "github-config.js"):
        os.remove(os.path.join(js_dir, f))
        print(f"🗑  Eliminado: js/{f}")

# 1. Generar js/SUPABASETOKEN_<suffix>.js
supa_file = os.path.join(js_dir, f"SUPABASETOKEN_{suffix}.js")
with open(supa_file, "w", encoding="utf-8") as f:
    f.write(f'window.SUPABASE_URL = "{supabase_url}";\n')
    f.write(f'window.SUPABASE_ANON_KEY = "{supabase_key}";\n')
print(f"✓ Generado: js/SUPABASETOKEN_{suffix}.js")

# 2. Inyectar los script tags en los HTML (reemplaza <!-- CONFIG_SCRIPTS -->)
html_files = [
    (os.path.join(os.path.dirname(__file__), "index.html"), "js"),
]
for modulo in ["login.html", "asignatura.html", "asignaturas.html",
               "clase.html", "apuntes_practicas_ejercicios_tareas.html", "visor.html"]:
    html_files.append((os.path.join(os.path.dirname(__file__), "modulos", modulo), "../js"))

for html_path, prefijo in html_files:
    if not os.path.exists(html_path):
        continue
    with open(html_path, "r", encoding="utf-8") as f:
        contenido = f.read()
    tags = f'<script src="{prefijo}/SUPABASETOKEN_{suffix}.js"></script>'
    nuevo = re.sub(r'<!-- CONFIG_SCRIPTS -->|<script src="[^"]*SUPABASETOKEN_[^"]*\.js"></script>', tags, contenido)
    if nuevo != contenido:
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(nuevo)
        print(f"✓ Inyectado en: {os.path.basename(html_path)}")

print("\n✅ Configuración local generada correctamente.")
print("   Recuerda: estos archivos están en .gitignore y NO se subirán a Git.")
