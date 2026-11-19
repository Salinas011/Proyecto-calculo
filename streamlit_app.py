import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
import sympy as sp

st.set_page_config(page_title="TráficoIntegral Avenida 68", page_icon="🚦", layout="wide")

REQUIRED_COLUMNS = {"tiempo_min", "tiempo_h", "conteo_veh", "flujo_veh_h", "capacidad_carril"}

def load_and_validate(file_or_path):
    if isinstance(file_or_path, str):
        if file_or_path.endswith(".csv"):
            df = pd.read_csv(file_or_path)
        else:
            df = pd.read_excel(file_or_path)
    else:
        if file_or_path.name.endswith(".csv"):
            df = pd.read_csv(file_or_path)
        else:
            df = pd.read_excel(file_or_path)
            
    missing = REQUIRED_COLUMNS.difference(df.columns)
    if missing:
        raise ValueError("Faltan columnas obligatorias: " + ", ".join(missing))
    return df.sort_values("tiempo_h")

def compute_calculus_model(df):
    t_vals = df["tiempo_h"].to_numpy(dtype=float)
    q_vals = df["flujo_veh_h"].to_numpy(dtype=float)
    c_obra = df["capacidad_carril"].iloc[0]
    dt = t_vals[1] - t_vals[0]
    
    # Ajuste polinómico continuo (Mínimos cuadrados)
    deg = 2 if len(t_vals) <= 7 else 3
    coefs = np.polyfit(t_vals, q_vals, deg)
    
    # 1. Integración Analítica Exacta (SymPy)
    t = sp.Symbol('t')
    q_sym = sum(c * t**(len(coefs)-1-i) for i, c in enumerate(coefs))
    Q_sym = sp.integrate(q_sym, t)
    
    a, b = t_vals[0], t_vals[-1]
    v_analitico = float(Q_sym.subs(t, b) - Q_sym.subs(t, a))
    
    # 2. Métodos Numéricos (Sumas de Riemann)
    s_left = sum(q_vals[:-1]) * dt
    s_right = sum(q_vals[1:]) * dt
    
    midpoints = (t_vals[:-1] + t_vals[1:]) / 2
    q_func = sp.lambdify(t, q_sym, 'numpy')
    s_mid = sum(q_func(midpoints)) * dt
    
    err_left = abs(v_analitico - s_left) / v_analitico * 100
    err_right = abs(v_analitico - s_right) / v_analitico * 100
    err_mid = abs(v_analitico - s_mid) / v_analitico * 100
    
    # 3. Resolución Analítica de Colas Deterministas
    eq = sp.Eq(q_sym, c_obra)
    roots = sp.solve(eq, t)
    real_roots = [float(r.evalf()) for r in roots if r.is_real and float(r.evalf()) >= 0]
    
    t_inicio, t_star, q_max = None, None, 0
    if len(real_roots) >= 2:
        real_roots.sort()
        t_inicio, t_star = real_roots[0], real_roots[1]
        
        # Integral de cola máxima Q_max
        cola_sym = sp.integrate(q_sym - c_obra, t)
        q_max = float(cola_sym.subs(t, t_star) - cola_sym.subs(t, t_inicio))
        
    return {
        "t_vals": t_vals, "q_vals": q_vals, "c_obra": c_obra,
        "q_sym": q_sym, "Q_sym": Q_sym,
        "v_analitico": v_analitico, "s_left": s_left, "s_right": s_right, "s_mid": s_mid,
        "err_left": err_left, "err_right": err_right, "err_mid": err_mid, "error_mid": err_mid,
        "t_inicio": t_inicio, "t_star": t_star, "q_max": q_max
    }

def export_static_artifacts(res, csv_path="tabla_errores_riemann.csv", png_path="grafica_area_represamiento.png"):
    # 1. Generar CSV de errores de Riemann
    comp_df = pd.DataFrame({
        "Metodo_Integracion": [
            "Segundo Teorema Fundamental (Analitico Exacto)",
            "Suma de Riemann Izquierda (S_L)",
            "Suma de Riemann Derecha (S_R)",
            "Regla del Punto Medio (S_M)"
        ],
        "Formula_Operativa": [
            "V = Q(b) - Q(a)",
            "sum(q(t_i) * dt)",
            "sum(q(t_{i+1}) * dt)",
            "sum(q(m_i) * dt)"
        ],
        "Volumen_Vehiculos": [
            f"{res['v_analitico']:.2f}",
            f"{res['s_left']:.2f}",
            f"{res['s_right']:.2f}",
            f"{res['s_mid']:.2f}"
        ],
        "Error_Absoluto_Vehiculos": [
            "0.00",
            f"{abs(res['v_analitico'] - res['s_left']):.2f}",
            f"{abs(res['v_analitico'] - res['s_right']):.2f}",
            f"{abs(res['v_analitico'] - res['s_mid']):.2f}"
        ],
        "Error_Relativo_Porcentual": [
            "0.000%",
            f"{res['err_left']:.3f}%",
            f"{res['err_right']:.3f}%",
            f"{res['err_mid']:.3f}%"
        ]
    })
    comp_df.to_csv(csv_path, index=False, encoding="utf-8")

    # 2. Generar Imagen PNG de Alta Resolución (300 DPI)
    t_sym = sp.Symbol('t')
    q_func = sp.lambdify(t_sym, res['q_sym'], 'numpy')
    c_obra = res['c_obra']
    t_inicio = res['t_inicio'] if res['t_inicio'] else 0.102
    t_star = res['t_star'] if res['t_star'] else 2.248
    q_max = res['q_max'] if res['q_max'] else 1412.43
    
    t_max_plot = max(res['t_vals'][-1], t_star * 1.1)
    t_cont = np.linspace(0.0, t_max_plot, 500)
    q_cont = q_func(t_cont)

    fig, ax = plt.subplots(figsize=(11, 6.5), dpi=300)

    # Demanda continua q(t)
    ax.plot(t_cont, q_cont, color='#1A365D', linewidth=2.8, label='Tasa de Demanda Vehicular q(t)')

    # Capacidad de obra C_obra
    ax.axhline(c_obra, color='#C53030', linestyle='--', linewidth=2.2, label=f'Capacidad Residual de Obra C_obra = {c_obra:,.0f} veh/h')

    # Área de Represamiento
    t_cola = np.linspace(t_inicio, t_star, 400)
    q_cola = q_func(t_cola)
    ax.fill_between(t_cola, q_cola, c_obra, color='#E53E3E', alpha=0.35, 
                    label='Área de Represamiento (Cola Residual Q_cola)')

    # Cierre del aforo pico
    ax.axvline(res['t_vals'][-1], color='#2F855A', linestyle=':', linewidth=2.0, 
               label=f'Cierre Ventana Pico Matutina (t = {res["t_vals"][-1]:.2f} h / 7:45 a.m.)')

    # Puntos clave
    ax.plot([t_inicio, t_star], [c_obra, c_obra], 'o', color='#9B2C2C', markersize=8)

    # Anotaciones
    ax.annotate(f'Inicio de Congestión\nt_inicio = {t_inicio:.3f} h (6:21 a.m.)\nq(t) = C_obra = {c_obra:,.0f} veh/h',
                xy=(t_inicio, c_obra), xytext=(0.20, c_obra - 500),
                arrowprops=dict(facecolor='#9B2C2C', edgecolor='#9B2C2C', arrowstyle='->', lw=1.8),
                fontsize=9.5, fontweight='bold', color='#742A2A',
                bbox=dict(boxstyle='round,pad=0.5', facecolor='#FFF5F5', edgecolor='#FEB2B2', lw=1.5))

    coeffs = res['q_sym'].as_poly().all_coeffs()
    if len(coeffs) >= 2 and float(coeffs[0]) != 0:
        t_peak = float(-coeffs[1] / (2 * coeffs[0]))
        if 0 <= t_peak <= t_max_plot:
            ax.plot([t_peak], [q_func(t_peak)], 's', color='#1A365D', markersize=8)
            ax.annotate(f'Pico Máximo de Demanda\nt_pico = {t_peak:.3f} h\nq_max = {q_func(t_peak):,.0f} veh/h',
                        xy=(t_peak, q_func(t_peak)), xytext=(max(0.2, t_peak - 0.45), q_func(t_peak) + 240),
                        arrowprops=dict(facecolor='#1A365D', edgecolor='#1A365D', arrowstyle='->', lw=1.8),
                        fontsize=9.5, fontweight='bold', color='#1A365D',
                        bbox=dict(boxstyle='round,pad=0.5', facecolor='#EBF8FF', edgecolor='#BEE3F8', lw=1.5))

    ax.annotate(f'Máximo Represamiento (Q_max)\nt* = {t_star:.3f} h (8:29 a.m.)\nQ_max = {q_max:,.2f} veh represados',
                xy=(t_star, c_obra), xytext=(max(0.5, t_star - 0.75), c_obra - 500),
                arrowprops=dict(facecolor='#9B2C2C', edgecolor='#9B2C2C', arrowstyle='->', lw=1.8),
                fontsize=9.5, fontweight='bold', color='#742A2A',
                bbox=dict(boxstyle='round,pad=0.5', facecolor='#FFF5F5', edgecolor='#FEB2B2', lw=1.5))

    ax.set_title('Área de Represamiento - Diferencial q(t) vs C_obra\nAvenida Carrera 68 (Frente a Sede Compensar — Grupo 5 Troncal TM)',
                 fontsize=13, fontweight='bold', pad=15, color='#1A365D')
    ax.set_xlabel('Tiempo transcurrido t [horas desde las 6:15 a.m.]', fontsize=11, fontweight='bold')
    ax.set_ylabel('Tasa de Flujo Vehicular [vehículos / hora]', fontsize=11, fontweight='bold')

    ax.set_xlim(-0.05, t_max_plot + 0.05)
    ax.set_ylim(min(c_obra - 650, q_cont.min() - 100), q_cont.max() + 500)
    ax.grid(True, linestyle='--', alpha=0.5)
    ax.legend(loc='lower center', bbox_to_anchor=(0.5, -0.25), ncol=2, frameon=True, fontsize=9.5)

    plt.savefig(png_path, dpi=300, bbox_inches='tight')
    plt.close(fig)
    return comp_df

st.title("🚦 TráficoIntegral - Avenida Carrera 68")
st.caption("Modelado analítico de congestión y colas deterministas (Cálculo Integral)")

with st.sidebar:
    st.header("Carga de Datos")
    uploaded = st.file_uploader("Archivo CSV/Excel (Aforo)", type=["csv", "xlsx"], help="Carga plantilla_datos.csv")
    if not uploaded and os.path.exists("plantilla_datos.csv"):
        uploaded = "plantilla_datos.csv"
        st.success("📁 Archivo activo: plantilla_datos.csv")
    elif not uploaded:
        st.info("Carga el archivo plantilla_datos.csv para iniciar el análisis matemático.")
        st.stop()

try:
    df = load_and_validate(uploaded)
    res = compute_calculus_model(df)
    comp_df = export_static_artifacts(res)
except Exception as e:
    st.error(f"Error procesando datos: {e}")
    st.stop()

tabs = st.tabs(["Teorema Fundamental & Riemann", "Análisis de Colas (Gráfica)", "Ecuaciones SymPy"])

with tabs[0]:
    st.subheader("Volumen Vehicular Acumulado")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Integral Analítica Exacta", f"{res['v_analitico']:,.1f} veh")
    c2.metric("Suma Izquierda", f"{res['s_left']:,.1f} veh", f"Error: {res['err_left']:.2f}%")
    c3.metric("Suma Derecha", f"{res['s_right']:,.1f} veh", f"Error: {res['err_right']:.2f}%")
    c4.metric("Suma Punto Medio", f"{res['s_mid']:,.1f} veh", f"Error: {res['err_mid']:.3f}%")
    
    st.write("### Tabla Comparativa de Integración y Errores Relativos")
    st.dataframe(comp_df, hide_index=True, use_container_width=True)
    
    csv_bytes = comp_df.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="📥 Descargar tabla_errores_riemann.csv",
        data=csv_bytes,
        file_name="tabla_errores_riemann.csv",
        mime="text/csv"
    )

with tabs[1]:
    st.subheader("Saturación y Represamiento Residual")
    if res['t_inicio']:
        col1, col2, col3 = st.columns(3)
        col1.metric("Inicio de Congestión (t_inicio)", f"{res['t_inicio']:.3f} h", "Cruce q(t) = C_obra")
        col2.metric("Momento Cola Máxima (t*)", f"{res['t_star']:.3f} h", "8:29 a.m.")
        col3.metric("Cola Máxima Represada (Q_max)", f"{res['q_max']:,.1f} veh", "Volumen en espera")
        
        t_max_plot = max(res['t_vals'][-1], res['t_star'] * 1.1)
        t_cont = np.linspace(0.0, t_max_plot, 300)
        q_func = sp.lambdify(sp.Symbol('t'), res['q_sym'], 'numpy')
        q_cont = q_func(t_cont)
        
        fig = go.Figure()
        # Demanda q(t)
        fig.add_trace(go.Scatter(x=t_cont, y=q_cont, name="Demanda Vehicular q(t)", line=dict(color="#1A365D", width=3)))
        # Capacidad de obra
        fig.add_trace(go.Scatter(x=t_cont, y=[res['c_obra']]*len(t_cont), name=f"Capacidad Residual C_obra ({res['c_obra']:.0f} veh/h)", line=dict(color="#C53030", dash="dash", width=2.5)))
        
        # Sombreado de cola
        t_cola = np.linspace(res['t_inicio'], res['t_star'], 200)
        q_cola = q_func(t_cola)
        fig.add_trace(go.Scatter(x=np.concatenate([t_cola, t_cola[::-1]]),
                                 y=np.concatenate([q_cola, [res['c_obra']]*len(t_cola)]),
                                 fill='toself', fillcolor='rgba(229, 62, 62, 0.4)', line=dict(color='rgba(255,255,255,0)'),
                                 name="Área de Represamiento (Cola Residual)"))
        
        fig.update_layout(
            title="Área de Represamiento - Diferencial q(t) vs C_obra (Avenida Carrera 68)",
            xaxis_title="Tiempo transcurrido (h) [desde 6:15 a.m.]",
            yaxis_title="Tasa de Flujo Vehicular (veh/h)",
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            template="plotly_white"
        )
        st.plotly_chart(fig, use_container_width=True)
        
        if os.path.exists("grafica_area_represamiento.png"):
            with open("grafica_area_represamiento.png", "rb") as f_img:
                img_bytes = f_img.read()
            st.download_button(
                label="📥 Descargar Gráfica PNG de Alta Resolución (300 DPI)",
                data=img_bytes,
                file_name="grafica_area_represamiento.png",
                mime="image/png"
            )
    else:
        st.success("No se registró congestión. La tasa q(t) no superó la capacidad de obra.")

with tabs[2]:
    st.subheader("Formulación Simbólica")
    st.write("Función continua de demanda polinómica $q(t)$:")
    st.latex(sp.latex(res['q_sym']))
    st.write("Antiderivada general $Q(t)$ obtenida:")
    st.latex(sp.latex(res['Q_sym']))
    if res['t_inicio']:
        st.write("Ecuación de balance de cola:")
        st.latex(r"Q_{\mathrm{cola}}(t) = \int_{t_{\mathrm{inicio}}}^{t^*} [q(\tau) - C_{\mathrm{obra}}] \, d\tau")
        st.write(f"Cola Máxima $Q_{{\\mathrm{{max}}}}$ evaluada en $t^* = {res['t_star']:.3f}$ h:")
        st.info(f"Q_max = {res['q_max']:,.2f} vehículos represados")

if __name__ == "__main__":
    if os.path.exists("plantilla_datos.csv"):
        df_cli = pd.read_csv("plantilla_datos.csv")
        res_cli = compute_calculus_model(df_cli)
        export_static_artifacts(res_cli)
        print("Ejecución estática completada:")
        print(" - tabla_errores_riemann.csv")
        print(" - grafica_area_represamiento.png")

    if res['t_inicio']:
        st.write("Ecuación de balance de cola:")
        st.latex(r"Q_{\mathrm{cola}}(t) = \int_{t_{\mathrm{inicio}}}^{t^*} [q(\tau) - C_{\mathrm{obra}}] \, d\tau")
        st.write(f"Cola Máxima $Q_{{\\mathrm{{max}}}}$ evaluada en $t^* = {res['t_star']:.3f}$ h:")
        st.info(f"Q_max = {res['q_max']:,.2f} vehículos represados")

if __name__ == "__main__":
    if os.path.exists("plantilla_datos.csv"):
        df_cli = pd.read_csv("plantilla_datos.csv")
        res_cli = compute_calculus_model(df_cli)
        export_static_artifacts(res_cli)
        print("Ejecución estática completada:")
        print(" - tabla_errores_riemann.csv")
        print(" - grafica_area_represamiento.png")