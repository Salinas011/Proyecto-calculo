function TraficoIntegralOnline
% TRAFICOINTEGRALONLINE MATLAB App para evaluar congestión mediante Cálculo Integral
% Basado en el Proyecto de la Fundación Universitaria Compensar

    app.Figure = uifigure('Name','TráficoIntegral - Av 68','Position',[100 100 1000 650]);
    root = uigridlayout(app.Figure,[1 2],'ColumnWidth',{280,'1x'});
    
    controls = uipanel(root,'Title','Parámetros del Proyecto');
    cg = uigridlayout(controls,[8 1],'RowHeight',{30,30,30,40,30,40,30,'1x'});
    
    app.FileLabel = uilabel(cg,'Text','Sin archivo cargado','FontWeight','bold');
    uibutton(cg,'push','Text','Cargar plantilla CSV','ButtonPushedFcn',@loadData);
    
    app.Method = uidropdown(cg,'Items',{'Teorema Fundamental','Sumas de Riemann'},'ValueChangedFcn',@refreshApp);
    
    app.VolLabel = uilabel(cg,'Text','Volumen V(t): -- veh');
    app.ErrorLabel = uilabel(cg,'Text','Error Relativo: -- %');
    app.MaxQueueLabel = uilabel(cg,'Text','Cola Máxima (Q_max): -- veh');
    
    app.Axes = uiaxes(root);
    title(app.Axes,'Modelo de Flujo q(t) y Retraso del Sistema');
    xlabel(app.Axes,'Tiempo (h)'); ylabel(app.Axes,'Tasa (veh/h)');
    grid(app.Axes,'on');

    function loadData(~,~)
        [file,path] = uigetfile({'*.csv;*.xlsx'},'Seleccione aforo');
        if isequal(file,0), return; end
        app.Data = readtable(fullfile(path,file),'VariableNamingRule','preserve');
        app.FileLabel.Text = file;
        refreshApp();
    end

    function refreshApp(~,~)
        if ~isprop(app,'Data') || isempty(app.Data), return; end
        
        t = app.Data.tiempo_h;
        q = app.Data.flujo_veh_h;
        c_obra = app.Data.capacidad_carril(1);
        dt = t(2) - t(1);
        
        % 1. Ajuste Analítico y Teorema Fundamental del Cálculo
        coefs = polyfit(t, q, 3);
        anti_q = polyint(coefs);
        v_analitico = diff(polyval(anti_q, [t(1), t(end)]));
        
        % 2. Sumas de Riemann (Izquierda y Punto Medio)
        s_left = sum(q(1:end-1)) * dt;
        midpoints = (t(1:end-1) + t(2:end)) / 2;
        s_mid = sum(polyval(coefs, midpoints)) * dt;
        error_relativo = abs(v_analitico - s_mid) / v_analitico * 100;
        
        % 3. Intersecciones y Colas
        coefs_shifted = coefs;
        coefs_shifted(end) = coefs_shifted(end) - c_obra;
        r = roots(coefs_shifted);
        r_reales = r(imag(r)==0 & r>=t(1) & r<=t(end));
        
        q_max = 0;
        if length(r_reales) >= 2
            r_reales = sort(r_reales);
            t_inicio = r_reales(1); t_star = r_reales(2);
            anti_cola = polyint(coefs_shifted);
            q_max = diff(polyval(anti_cola, [t_inicio, t_star]));
        end
        
        % Actualizar métricas
        app.VolLabel.Text = sprintf('Volumen V(t): %.1f veh', v_analitico);
        app.ErrorLabel.Text = sprintf('Error Relativo (Mid): %.3f %%', error_relativo);
        app.MaxQueueLabel.Text = sprintf('Cola Máxima (Q_max): %.1f veh', q_max);
        
        % Gráfica
        cla(app.Axes);
        t_cont = linspace(t(1), t(end), 200);
        q_cont = polyval(coefs, t_cont);
        
        hold(app.Axes,'on');
        plot(app.Axes, t_cont, q_cont, 'b-', 'LineWidth', 2);
        plot(app.Axes, t_cont, c_obra*ones(size(t_cont)), 'r--', 'LineWidth', 2);
        
        if length(r_reales) >= 2
            idx = t_cont >= t_inicio & t_cont <= t_star;
            fill(app.Axes, [t_cont(idx) fliplr(t_cont(idx))], ...
                [q_cont(idx) c_obra*ones(1,sum(idx))], 'r', 'FaceAlpha', 0.3, 'EdgeColor','none');
        end
        hold(app.Axes,'off');
        legend(app.Axes, {'Tasa q(t) Analítica', 'Capacidad (C_obra)', 'Retraso (Cola)'},'Location','best');
    end
end