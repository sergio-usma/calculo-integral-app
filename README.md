# Cálculo Integral desde cero

App web (React + TypeScript + Vite, 100 % estática) para preparar el examen de Cálculo Integral:
taller resuelto línea por línea, variantes ilimitadas, gráficas interactivas y guía de la Casio fx-570ES PLUS.
Todas las fórmulas se muestran en LaTeX (KaTeX).

## Qué incluye

- **Taller resuelto** (9 ejercicios) con visor de pasos tipo depurador (líneas L1…, breakpoints, variables).
- **Gráficas interactivas** (área, rectángulo `dx`, suma de rectángulos, integral definida).
- **Práctica**: 4 variantes por ejercicio (2 gemelas + 2 retos con trigonometría y π).
- **🐍 Versión en Python por ejercicio**: script SymPy bloque a bloque, ejecutable en el navegador (Pyodide, opcional), copiable y descargable. Todos los scripts se verifican con Python real (`scripts/verify-python.py`).
- **Agente de IA (opcional)**: pega tu API key (OpenAI / opencode Go / compatible) y el ID del modelo; cita líneas con clic o `@L5` / `@P12`. Respuestas en LaTeX. La clave solo vive en tu navegador.
- **Quiz guiado** con autocompletado, pistas graduadas, temporizador de 15 min y pista del agente.
- **Modo examen** con temporizador, gráfica con clics (marcar cortes) y corrección con rúbrica.
- **Casio fx-570ES PLUS**: teclas para verificar cada ejercicio.

- **Cheatsheet explicado** (36 fórmulas con porqué, ejemplo y mnemotecnia; las verificables están comprobadas numéricamente) y **tarjetas de repaso espaciado**.
- **Álgebra desde cero**: 7 lecciones con ejemplo paso a paso, práctica con ejercicios generados y diagnóstico.
- **Estudio y progreso**: plan para antes del examen, técnicas para atención/memoria y racha.
- **Modo offline**: service worker propio (la app queda guardada tras la primera visita).

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm test         # verifica con cálculo numérico que TODAS las variantes son matemáticamente correctas
npm run build    # genera dist/

# Verificar los scripts de Python generados con Python real (requiere: pip install sympy)
PY_OUT=py-scripts.json npx vitest run scripts/export-python.test.ts
python scripts/verify-python.py py-scripts.json

# Pruebas de interfaz reales en Edge (requiere: npx vite preview --port 4173)
node scripts/e2e-ui.mjs <carpeta>      # examen con clics, quiz, panel del agente
node scripts/e2e-stage3.mjs <carpeta>  # cheatsheet, tarjetas, álgebra y modo OFFLINE
node scripts/e2e-pyodide.mjs           # ejecuta el script de Python dentro del navegador
```

## Publicar en GitHub Pages

1. Crea un repositorio vacío en GitHub (por ejemplo `calculo-integral-app`).
2. Desde esta carpeta:

```bash
git branch -M main
git remote add origin https://github.com/<tu-usuario>/calculo-integral-app.git
git push -u origin main
```

3. En GitHub: **Settings → Pages → Build and deployment → Source: “GitHub Actions”**.
4. El workflow `.github/workflows/deploy.yml` corre las pruebas, construye y publica.
   La URL será `https://<tu-usuario>.github.io/calculo-integral-app/`.

La app usa rutas con `#` y `base: './'`, así que funciona en cualquier nombre de repositorio.
