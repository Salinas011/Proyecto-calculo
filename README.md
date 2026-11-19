# TráficoIntegral Online

Proyecto de simulación computacional mediante Cálculo Integral aplicado a la congestión vehicular de la Avenida Carrera 68. Desarrollado por estudiantes de Ingeniería de Software de la Fundación Universitaria Compensar.

**Autores:** Andres Salinas, Nicolas Caceres, Paula Garcia, Juan Mendez, Laura Alquichides.  
**Docente:** Francisco Esteban Rodriguez Medranda.

## Estructura del Aplicativo

La plataforma incluye dos entornos de validación que resuelven los planteamientos del documento de investigación:

- `TraficoIntegralOnline.m`: Interfaz UI interactiva para MATLAB.
- `streamlit_app.py`: Aplicación web moderna ejecutada mediante Streamlit.

## Matemática Implementada

El sistema asimila un archivo CSV (`plantilla_datos.csv`) con los aforos de campo y aplica:

1. **Segundo Teorema Fundamental del Cálculo:** $V_{analitico} = \int_{a}^{b} q(t) dt = Q(b) - Q(a)$ utilizando la librería `sympy` (Python) y funciones `polyval/polyint` (MATLAB) para la primitiva exacta.
2. **Métodos Numéricos:** Implementación vectorial de Sumas de Riemann (Izquierda, Derecha y Punto Medio) computando su error relativo.
3. **Dinámica de Colas Deterministas:** Identificación de las raíces analíticas donde $q(t) = C_{obra}$ para determinar el instante de inicio de congestión y calcular el pico represado mediante $\int_{t_{inicio}}^{t*} [q(\tau) - C_{obra}] d\tau$.

## Ejecución Local (Streamlit)

```bash
python -m pip install -r requirements.txt
streamlit run streamlit_app.py
```
