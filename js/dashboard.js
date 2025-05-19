document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores de Elementos HTML ---
    const yearSelect = document.getElementById('yearSelect');
    const gpSelect = document.getElementById('gpSelect');
    const sessionSelect = document.getElementById('sessionSelect');
    const driverSelect = document.getElementById('driverSelect');
    const loadDataButton = document.getElementById('loadDataButton');
    const infoDisplay = document.getElementById('infoDisplay');
    const plotArea = document.getElementById('plotArea');
    const xAxisTimeRadio = document.getElementById('xAxisTime'); 
    const xAxisLapRadio = document.getElementById('xAxisLap');   

    // --- Configuración y Cachés ---
    const BASE_DATA_PATH = 'data';
    const DEFAULT_YEAR = "2025"; 

    let meetingsDataCache = {}; 
    let driverListDataCache = {}; 
    let lapDataCache = {}; 
    let plotDataCache = {}; 

    // --- Funciones Auxiliares ---
    async function fetchJSON(url) {
        console.log("Intentando cargar JSON desde:", url);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Error HTTP! status: ${response.status} para ${url}`);
                throw new Error(`HTTP error! status: ${response.status} for ${url}`);
            }
            const data = await response.json();
            // console.log("JSON cargado exitosamente:", url, data); // Comentado para evitar logs grandes
            console.log("JSON cargado exitosamente:", url);
            return data;
        } catch (error) {
            console.error("Error fetching JSON:", url, error);
            return null;
        }
    }

    function populateSelect(selectElement, options, defaultOptionText = "Selecciona...") {
        selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
        options.forEach(option => {
            const value = typeof option === 'object' ? option.value : option;
            const text = typeof option === 'object' ? option.text : option;
            selectElement.add(new Option(text, value));
        });
        selectElement.disabled = false;
    }

    function resetAndDisableSelect(selectElement, defaultText = "Selecciona...") {
        selectElement.innerHTML = `<option value="">${defaultText}</option>`;
        selectElement.disabled = true;
    }
    
    function timeStringToDate(timeStr) {
        if (!timeStr || !/^\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(timeStr)) {
            // console.warn("Formato de timestamp de vuelta inválido:", timeStr);
            return null; 
        }
        const mainTime = timeStr.substring(0,8); 
        const msPart = timeStr.length > 8 ? timeStr.substring(9) : "000"; 
        
        const parts = mainTime.split(':');
        const date = new Date(0); 
        date.setUTCHours(parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10), parseInt(msPart.padEnd(3, '0'), 10));
        return date;
    }

    // --- Lógica de Carga y Actualización de Selects (Dropdowns) ---
    async function loadYears() {
        const availableYears = ["2024", "2025"]; 
        populateSelect(yearSelect, availableYears, "Selecciona un Año");
        
        if (availableYears.length > 0) {
            const preselectYear = availableYears.includes(DEFAULT_YEAR) ? DEFAULT_YEAR : availableYears[availableYears.length - 1];
            yearSelect.value = preselectYear;
            await loadGPsForYear(yearSelect.value);
        }
    }

    async function loadGPsForYear(year) {
        resetAndDisableSelect(gpSelect, "Cargando GPs...");
        resetAndDisableSelect(sessionSelect);
        resetAndDisableSelect(driverSelect);
        loadDataButton.disabled = true;
        plotArea.innerHTML = "<p>Cargando GPs...</p>";

        if (!year) { plotArea.innerHTML = "<p>Por favor, selecciona un año.</p>"; return; }

        if (meetingsDataCache[year]) {
            populateGPSelectWithOptions(meetingsDataCache[year]);
            if(gpSelect.options.length > 1 && gpSelect.value === "") plotArea.innerHTML = "<p>Selecciona un GP.</p>"; 
            else if(gpSelect.options.length <= 1 && gpSelect.value === "") plotArea.innerHTML = "<p>No hay GPs disponibles para este año.</p>";
            return;
        }

        const meetingsIndexURL = `${BASE_DATA_PATH}/${year}_MeetingsIndex.json`;
        const currentMeetingsData = await fetchJSON(meetingsIndexURL);

        if (currentMeetingsData) {
            meetingsDataCache[year] = currentMeetingsData;
            populateGPSelectWithOptions(currentMeetingsData);
            if(gpSelect.options.length > 1 && gpSelect.value === "") plotArea.innerHTML = "<p>Selecciona un GP.</p>"; 
            else if(gpSelect.options.length <= 1 && gpSelect.value === "") plotArea.innerHTML = "<p>No hay GPs disponibles para este año.</p>";
        } else {
            resetAndDisableSelect(gpSelect, "No hay GPs o error al cargar");
            plotArea.innerHTML = "<p>Error al cargar los GPs para el año seleccionado.</p>";
        }
    }

    function populateGPSelectWithOptions(dataForYear) {
        if (dataForYear && dataForYear.Meetings && dataForYear.Meetings.length > 0) {
            const gpOptions = dataForYear.Meetings.map(meeting => ({
                value: meeting.Name,
                text: meeting.Name
            })).sort((a, b) => a.text.localeCompare(b.text));
            populateSelect(gpSelect, gpOptions, "Selecciona un GP");
        } else {
            resetAndDisableSelect(gpSelect, "No hay GPs para este año");
        }
    }

    async function loadSessionsForGP(gpName) {
        resetAndDisableSelect(sessionSelect, "Cargando Sesiones...");
        resetAndDisableSelect(driverSelect);
        loadDataButton.disabled = true;
        plotArea.innerHTML = "<p>Cargando sesiones...</p>";

        const year = yearSelect.value;
        if (!gpName || !year || !meetingsDataCache[year] || !meetingsDataCache[year].Meetings) {
            plotArea.innerHTML = "<p>Error interno al cargar sesiones.</p>"; return;
        }

        const currentMeetingsData = meetingsDataCache[year];
        const selectedGPData = currentMeetingsData.Meetings.find(m => m.Name === gpName);

        if (selectedGPData && selectedGPData.Sessions && selectedGPData.Sessions.length > 0) {
            const sessionOptions = selectedGPData.Sessions.map(session => ({
                value: session.Name,
                text: `${session.Name} (${session.Type})`
            })).sort((a, b) => a.text.localeCompare(b.text));
            populateSelect(sessionSelect, sessionOptions, "Selecciona una Sesión");
            if(sessionSelect.options.length > 1 && sessionSelect.value === "") plotArea.innerHTML = "<p>Selecciona una sesión.</p>"; 
            else if(sessionSelect.options.length <= 1 && sessionSelect.value === "") plotArea.innerHTML = "<p>No hay sesiones para este GP.</p>";
        } else {
            resetAndDisableSelect(sessionSelect, "No hay sesiones para este GP");
            plotArea.innerHTML = "<p>No se encontraron sesiones para el GP seleccionado.</p>";
        }
    }

    async function loadDriversForSession(gpName, sessionName) {
        resetAndDisableSelect(driverSelect, "Cargando Pilotos...");
        loadDataButton.disabled = true;
        plotArea.innerHTML = "<p>Cargando lista de pilotos...</p>";

        const year = yearSelect.value;
        if (!year || !gpName || !sessionName || !meetingsDataCache[year]) {
             plotArea.innerHTML = "<p>Error interno al cargar pilotos.</p>"; return;
        }

        const currentMeetingsData = meetingsDataCache[year];
        const selectedGP = currentMeetingsData.Meetings.find(m => m.Name === gpName);
        if (!selectedGP) { plotArea.innerHTML = "<p>Error: GP no encontrado.</p>"; return; }

        const selectedSession = selectedGP.Sessions.find(s => s.Name === sessionName);
        if (!selectedSession || !selectedSession.Path) {
            resetAndDisableSelect(driverSelect, "Detalles de sesión no encontrados");
            plotArea.innerHTML = "<p>Error: Detalles de la sesión no encontrados.</p>"; return;
        }

        const sessionApiPath = selectedSession.Path;
        const driverListURL = `${BASE_DATA_PATH}/${sessionApiPath}json/DriverList.json`;

        if (driverListDataCache[driverListURL]) {
            populateDriverSelectWithOptions(driverListDataCache[driverListURL]);
            loadDataButton.disabled = false;
            plotArea.innerHTML = "<p>Selecciona un piloto (opcional) y carga los datos.</p>";
            return;
        }

        const currentDriverListData = await fetchJSON(driverListURL);

        if (currentDriverListData) {
            driverListDataCache[driverListURL] = currentDriverListData;
            populateDriverSelectWithOptions(currentDriverListData);
        } else {
            resetAndDisableSelect(driverSelect, "No hay lista de pilotos (o error)");
        }
        loadDataButton.disabled = false;
        plotArea.innerHTML = "<p>Selecciona un piloto (opcional) y carga los datos.</p>";
    }

    function populateDriverSelectWithOptions(dataForDrivers) {
        if (dataForDrivers && Object.keys(dataForDrivers).length > 0) {
            const driverOptions = Object.values(dataForDrivers).map(driver => ({
                value: driver.Tla,
                text: `${driver.FirstName || ''} ${driver.LastName || ''} (${driver.Tla}) - #${driver.RacingNumber}`.trim()
            })).sort((a, b) => a.text.localeCompare(b.text));
            populateSelect(driverSelect, driverOptions, "Selecciona un Piloto (Opcional)");
        } else {
            resetAndDisableSelect(driverSelect, "No hay lista de pilotos");
        }
    }
    
    // --- Lógica de Carga de Datos del Dashboard y Gráficos ---
    async function displaySelectedData() {
        const year = yearSelect.value;
        const gpName = gpSelect.value;
        const sessionName = sessionSelect.value;
        const driverTla = driverSelect.value;
        const selectedXAxisType = document.querySelector('input[name="xAxisType"]:checked').value;

        if (!year || !gpName || !sessionName) {
            infoDisplay.innerHTML = "<p>Por favor, selecciona Año, GP y Sesión.</p>";
            plotArea.innerHTML = ""; return;
        }

        infoDisplay.innerHTML = `<p>Cargando datos para:
            <strong>Año:</strong> ${year}, <strong>GP:</strong> ${gpName}, <strong>Sesión:</strong> ${sessionName},
            <strong>Piloto:</strong> ${driverTla || "No seleccionado"}, <strong>Eje X:</strong> ${selectedXAxisType === 'lap' ? 'Vuelta' : 'Tiempo'}
        </p>`;

        plotArea.innerHTML = `
            <div id="speedPlotContainer" class="plot-container"></div>
            <div id="rpmPlotContainer" class="plot-container"></div>
            <div id="gearPlotContainer" class="plot-container"></div>
            <div id="throttleBrakePlotContainer" class="plot-container"></div>
            <div id="drsPlotContainer" class="plot-container"></div>
            <div id="loadingPlotsMsg" style="text-align: center; padding: 20px;">Cargando gráficos...</div>`;

        const plotDivsMap = {
            speed: document.getElementById('speedPlotContainer'),
            rpm: document.getElementById('rpmPlotContainer'),
            gear: document.getElementById('gearPlotContainer'),
            throttleBrake: document.getElementById('throttleBrakePlotContainer'),
            drs: document.getElementById('drsPlotContainer')
        };
        const loadingPlotsMsgDiv = document.getElementById('loadingPlotsMsg');
        plotDataCache = {}; // Reset plot data cache for new data load

        const currentMeetingsData = meetingsDataCache[year];
        if (!currentMeetingsData) { if(loadingPlotsMsgDiv) loadingPlotsMsgDiv.remove(); plotArea.innerHTML = "<p style='color:red;'>Error: Datos de meetings no encontrados.</p>"; return; }
        const currentGP = currentMeetingsData.Meetings.find(m => m.Name === gpName);
        if (!currentGP) { if(loadingPlotsMsgDiv) loadingPlotsMsgDiv.remove(); plotArea.innerHTML = "<p style='color:red;'>Error: GP no encontrado.</p>"; return; }
        const currentSession = currentGP.Sessions.find(s => s.Name === sessionName);
        if (!currentSession || !currentSession.Path) { if(loadingPlotsMsgDiv) loadingPlotsMsgDiv.remove(); plotArea.innerHTML = "<p style='color:red;'>Error: Sesión no encontrada.</p>"; return; }

        const sessionApiPath = currentSession.Path;
        const carDataProcessedURL = `${BASE_DATA_PATH}/${sessionApiPath}jsonStream_processed/CarData.jsonl`;
        const driverListURL = `${BASE_DATA_PATH}/${sessionApiPath}json/DriverList.json`;
        const lapCountOriginalFile = `${BASE_DATA_PATH}/${sessionApiPath}jsonStream/LapCount.jsonStream`; 

        const channelMapping = {
            '0': { name: 'RPM', unit: 'rpm' }, '2': { name: 'Velocidad', unit: 'km/h' },
            '3': { name: 'Marcha', unit: '' }, '4': { name: 'Acelerador', unit: '%' },
            '5': { name: 'Freno', unit: '%' }, '45': { name: 'DRS', unit: 'Estado' }
        };

        try {
            let activeDriverListData = driverListDataCache[driverListURL];
            if (!activeDriverListData && driverTla) {
                activeDriverListData = await fetchJSON(driverListURL);
                if (activeDriverListData) driverListDataCache[driverListURL] = activeDriverListData;
            }

            const carDataResponse = await fetch(carDataProcessedURL);
            if (!carDataResponse.ok) throw new Error(`No se pudo cargar CarData: ${carDataProcessedURL}`);
            const carDataText = await carDataResponse.text();

            let lapData = null;
            if (selectedXAxisType === 'lap') {
                if (lapDataCache[lapCountOriginalFile]) { 
                    lapData = lapDataCache[lapCountOriginalFile]; 
                    console.log("Usando LapData de caché:", lapCountOriginalFile);
                } else {
                    console.log("Intentando cargar LapData desde:", lapCountOriginalFile);
                    const lapCountResponse = await fetch(lapCountOriginalFile);
                    if (lapCountResponse.ok) {
                        const lapCountText = await lapCountResponse.text();
                        if (lapCountText.trim()) {
                            const rawLapEntries = lapCountText.trim().split('\n');
                            lapData = rawLapEntries.map(line => {
                                if (!line.trim()) return null;
                                const firstBraceIndex = line.indexOf('{');
                                if (firstBraceIndex === -1) return null;
                                const timestampStr = line.substring(0, firstBraceIndex);
                                const jsonStr = line.substring(firstBraceIndex);
                                try {
                                    const jsonData = JSON.parse(jsonStr);
                                    if (jsonData && jsonData.CurrentLap !== undefined) {
                                        const tsDate = timeStringToDate(timestampStr);
                                        return tsDate ? { timestamp: tsDate, lap: parseInt(jsonData.CurrentLap) } : null;
                                    }
                                    return null;
                                } catch (e) { return null; }
                            }).filter(Boolean).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // Asegurar orden por tiempo

                            if (lapData.length > 0) {
                                lapDataCache[lapCountOriginalFile] = lapData;
                                console.log("LAP DATA (primeras 5):", JSON.stringify(lapData.slice(0, 5).map(d => ({timestamp: d.timestamp.toISOString(), lap: d.lap})), null, 2));
                                console.log("LAP DATA (últimas 5):", JSON.stringify(lapData.slice(-5).map(d => ({timestamp: d.timestamp.toISOString(), lap: d.lap})), null, 2));
                            } else {
                                console.warn("LapCount.jsonStream no contenía datos de vuelta válidos después del parseo.");
                            }
                        } else { console.warn(`El archivo ${lapCountOriginalFile} está vacío.`); }
                    } else { console.warn(`No se pudo cargar ${lapCountOriginalFile} (${lapCountResponse.status})`); }
                }
            }

            if (!carDataText.trim()) { /* ... (manejo de CarData vacío) ... */ return; }
            const lines = carDataText.trim().split('\n');
            const allCarDataEntries = lines.map(line => { try { return JSON.parse(line); } catch (e) { return null; }}).filter(Boolean);

            if (allCarDataEntries.length === 0) { /* ... (manejo de allCarDataEntries vacío) ... */ return; }
            
            let pilotCarData = [];
            if (driverTla && activeDriverListData) {
                const selectedDriverDetails = Object.values(activeDriverListData).find(d => d.Tla === driverTla);
                if (selectedDriverDetails) {
                    const racingNumber = selectedDriverDetails.RacingNumber;
                    allCarDataEntries.forEach(entry => {
                        if (entry.data && entry.data.Entries) {
                            entry.data.Entries.forEach(e => {
                                if (e.Cars && e.Cars[racingNumber] && e.Cars[racingNumber].Channels) {
                                    pilotCarData.push({ Utc: new Date(e.Utc), Channels: e.Cars[racingNumber].Channels });
                                }
                            });
                        }
                    });
                }
            } else if (!driverTla) { /* ... (mensaje si no hay piloto) ... */ }
            
            // Ordenar pilotCarData por Utc para asegurar la correcta asignación de vueltas
            pilotCarData.sort((a,b) => a.Utc - b.Utc);
            // console.log("PILOT CAR DATA TIMESTAMPS (primeros 5):", pilotCarData.slice(0,5).map(d => d.Utc.toISOString()));
            // console.log("PILOT CAR DATA TIMESTAMPS (últimos 5):", pilotCarData.slice(-5).map(d => d.Utc.toISOString()));


            if (pilotCarData.length > 0) {
                if (loadingPlotsMsgDiv) loadingPlotsMsgDiv.remove();
                // infoDisplay.innerHTML += `<p>Se encontraron ${pilotCarData.length} entradas de CarData.</p>`;

                let xAxisData = [];
                let xAxisTitle = 'Tiempo';
                let xAxisType = 'date';
                let hoverXFormatFunction = (xVal) => new Date(xVal).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });

                if (selectedXAxisType === 'lap' && lapData && lapData.length > 0) {
                    xAxisTitle = 'Vuelta';
                    xAxisType = 'linear';
                    hoverXFormatFunction = (xVal) => `Vta ${xVal.toFixed(0)}`;
                    
                    let currentLapEntryIndex = 0;
                    pilotCarData.forEach(carEntry => {
                        if (!(carEntry.Utc instanceof Date) || isNaN(carEntry.Utc.getTime())) {
                            xAxisData.push(undefined); return;
                        }
                        let assignedLap = undefined;
                        // Iterar sobre lapData para encontrar la vuelta correcta
                        for (let i = 0; i < lapData.length; i++) {
                            const lapStartTimestamp = lapData[i].timestamp;
                            const nextLapStartTimestamp = (i + 1 < lapData.length) ? lapData[i + 1].timestamp : null;

                            if (carEntry.Utc >= lapStartTimestamp) {
                                if (nextLapStartTimestamp === null || carEntry.Utc < nextLapStartTimestamp) {
                                    assignedLap = lapData[i].lap;
                                    break; 
                                }
                                // Si carEntry.Utc es >= nextLapStartTimestamp, la vuelta actual es la siguiente
                            } else { 
                                // carEntry.Utc es anterior al inicio de la primera vuelta registrada (lapData[0])
                                // Esto sería una outlap o vuelta 0
                                assignedLap = (lapData[0].lap > 0) ? lapData[0].lap - 1 : 0;
                                break;
                            }
                        }
                        if (assignedLap === undefined) { // Si no se asignó (p.ej., pilotCarData está más allá de todos los lapData)
                            assignedLap = lapData[lapData.length - 1].lap; // Asignar la última vuelta conocida
                        }
                        xAxisData.push(assignedLap);
                    });
                    
                    // console.log("X AXIS DATA (VUELTAS - primeras 50):", JSON.stringify(xAxisData.slice(0, 50), null, 2));
                    // const lapCounts = xAxisData.reduce((acc, lap) => { acc[lap] = (acc[lap] || 0) + 1; return acc; }, {});
                    // console.log("CONTEO DE VUELTAS EN XAXISDATA:", lapCounts);


                    if (pilotCarData.length > 0 && xAxisData.some(val => val === undefined)) {
                        console.warn("Algunos puntos de CarData no pudieron ser mapeados a vueltas (undefined).");
                    }
                    if (pilotCarData.length > 0 && xAxisData.length !== pilotCarData.length) {
                         console.warn("Discrepancia en longitud de xAxisData y pilotCarData al mapear vueltas. Revirtiendo a tiempo.");
                         xAxisData = pilotCarData.map(d => d.Utc);
                         xAxisTitle = 'Tiempo (Error Vueltas)'; xAxisType = 'date';
                         hoverXFormatFunction = (xVal) => new Date(xVal).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
                    }

                } else {
                    xAxisData = pilotCarData.map(d => d.Utc);
                    if (selectedXAxisType === 'lap' && (!lapData || lapData.length === 0)) {
                        infoDisplay.innerHTML += `<p style="color:orange;">Advertencia: No se encontraron datos de vueltas. Mostrando por tiempo.</p>`;
                    }
                }

                // ... (Resto de la función: commonXAxisConfig, commonLayoutProps, createOrUpdatePlot y su llamada, sincronización de hover/zoom)
                // Asegúrate de que createOrUpdatePlot y la lógica de hover manejen correctamente los `xAxisData` que pueden tener `undefined`
                // y que la búsqueda de `closestIndex` en el hover sea robusta para el `xAxisType`.

                const commonXAxisConfig = { type: xAxisType, title: { text: xAxisTitle, font: {size: 12} }, tickfont: {size: 10}, automargin: true };
                const commonLayoutProps = {
                    margin: { l: 60, r: 40, t: 60, b: 50 }, height: 280, uirevision: 'true', xaxis: commonXAxisConfig,
                    hovermode: selectedXAxisType === 'lap' ? 'closest' : 'x unified',
                    legend: { orientation: "h", yanchor: "bottom", y: 1.05, xanchor: "right", x: 1, font: {size:10} }
                };
                
                function createOrUpdatePlot(divId, traces, layoutConfig, dataKey, defaultName) {
                    const div = plotDivsMap[divId];
                    if (!div) return;
                    
                    const validDataTraces = traces.map(trace => {
                        const validPoints = trace.x.map((xVal, i) => xVal !== undefined && trace.y[i] !== undefined && trace.y[i] !== null)
                                                 .map((isValid, i) => isValid ? i : -1)
                                                 .filter(i => i !== -1);
                        return {
                            ...trace,
                            x: validPoints.map(i => trace.x[i]),
                            y: validPoints.map(i => trace.y[i])
                        };
                    }).filter(trace => trace.x.length > 0);


                    if (validDataTraces.length === 0 || !validDataTraces.some(trace => trace.y.length > 0) ) {
                        div.innerHTML = `<p class="no-data-msg">No hay datos válidos de ${defaultName} para ${driverTla || 'esta selección'}.</p>`;
                        plotDataCache[dataKey] = null; return;
                    }

                    Plotly.newPlot(div, validDataTraces, layoutConfig);
                    plotDataCache[dataKey] = {
                        xValues: validDataTraces[0].x, 
                        traces: validDataTraces.map(t => ({ y: t.y, name: t.name, channelId: t.channelIdForHover }))
                    };
                }
                
                const plotConfigs = [
                    { id: 'speed', chan: '2', color: '#1f77b4' }, { id: 'rpm', chan: '0', color: 'red' },
                    { id: 'gear', chan: '3', color: 'green', lineShape: 'hv' },
                    { id: 'drs', chan: '45', color: 'purple', lineShape: 'hv' }
                ];

                plotConfigs.forEach(p => {
                    const values = pilotCarData.map(d => d.Channels[p.chan]);
                    const yAxisConfig = { title: {text: channelMapping[p.chan].unit || 'Valor', font:{size:10}}, tickfont:{size:9}, autorange:true };
                    const validValues = values.filter(v => v !== undefined && v !== null && !isNaN(v));
                    if (p.id === 'gear' && validValues.length > 0) yAxisConfig.range = [Math.min(0,...validValues) - 0.5, Math.max(0,...validValues) + 0.5];
                    if (p.id === 'drs' && validValues.length > 0) yAxisConfig.range = [-0.5, Math.max(0,...validValues) + 0.5]; else if (p.id === 'drs') yAxisConfig.range = [-0.5, 2.5]; // Default si no hay datos de DRS
                    
                    const layout = { ...commonLayoutProps, title: {text: `${channelMapping[p.chan].name} (${driverTla || 'N/A'})`, font:{size:14}}, yaxis: yAxisConfig };
                    
                    createOrUpdatePlot(p.id, 
                        [{ x: xAxisData, y: values, type: 'scatter', mode: 'lines', name: channelMapping[p.chan].name, line: { color: p.color, shape: p.lineShape || 'linear'}, channelIdForHover: p.chan }],
                        layout, p.id, channelMapping[p.chan].name
                    );
                });

                const throttleValues = pilotCarData.map(d => d.Channels['4']);
                const brakeValues = pilotCarData.map(d => d.Channels['5']);
                const tbTraces = [];
                if (throttleValues.some(v => v !== undefined)) tbTraces.push({ x: xAxisData, y: throttleValues, type: 'scatter', mode: 'lines', name: channelMapping['4'].name, line: {color: 'blue'}, channelIdForHover: '4' });
                if (brakeValues.some(v => v !== undefined)) tbTraces.push({ x: xAxisData, y: brakeValues, type: 'scatter', mode: 'lines', name: channelMapping['5'].name, line: {color: 'orange'}, channelIdForHover: '5' });
                createOrUpdatePlot('throttleBrake', tbTraces,
                    { ...commonLayoutProps, title: {text:`Acelerador/Freno (${driverTla || 'N/A'})`, font:{size:14}}, yaxis: { title: {text:'%', font:{size:10}}, tickfont:{size:9}, range: [-5, 105] } },
                    'throttleBrake', 'Acelerador/Freno'
                );

                const activePlotDivs = Object.values(plotDivsMap).filter(div => div && div.data && div.data.length > 0);
                activePlotDivs.forEach(masterPlotDiv => {
                    masterPlotDiv.on('plotly_relayout', (eventData) => { 
                        const newXRange = {};
                        if (eventData['xaxis.range[0]'] !== undefined && eventData['xaxis.range[1]'] !== undefined) {
                            newXRange['xaxis.range'] = [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']];
                        } else if (eventData['xaxis.autorange']) { newXRange['xaxis.autorange'] = true; }
                        
                        if (Object.keys(newXRange).length > 0) {
                            activePlotDivs.forEach(slavePlotDiv => {
                                if (slavePlotDiv !== masterPlotDiv) Plotly.relayout(slavePlotDiv, newXRange);
                            });
                        }
                    });

                    masterPlotDiv.on('plotly_hover', (eventData) => {
                        if (!eventData.points || eventData.points.length === 0) return;
                        const xHoverValue = eventData.points[0].x;
                        
                        activePlotDivs.forEach(plotDiv => {
                            const currentLayout = plotDiv.layout;
                            let newShapes = (currentLayout.shapes || []).filter(s => s.name !== 'hover-line');
                            let newAnnotations = (currentLayout.annotations || []).filter(a => a.name !== 'hover-annotation');

                            newShapes.push({
                                type: 'line', name: 'hover-line',
                                x0: xHoverValue, x1: xHoverValue,
                                y0: currentLayout.yaxis.range ? currentLayout.yaxis.range[0] : 0, 
                                y1: currentLayout.yaxis.range ? currentLayout.yaxis.range[1] : 1,
                                yref: 'y', line: { color: 'rgba(100,100,100,0.7)', width: 1 }
                            });

                            const plotKey = Object.keys(plotDivsMap).find(key => plotDivsMap[key] === plotDiv);
                            if (plotDataCache[plotKey] && plotDataCache[plotKey].xValues && plotDataCache[plotKey].xValues.length > 0) {
                                const dataForPlot = plotDataCache[plotKey];
                                let closestIndex = -1;
                                
                                if (dataForPlot.xValues.length > 0) {
                                    let minDiff = Infinity;
                                    dataForPlot.xValues.forEach((val, idx) => {
                                        if (val === undefined) return;
                                        const diff = selectedXAxisType === 'time' ? 
                                                     Math.abs(new Date(val).getTime() - new Date(xHoverValue).getTime()) : 
                                                     Math.abs(val - xHoverValue);
                                        if (diff < minDiff) { minDiff = diff; closestIndex = idx; }
                                        else if (diff === minDiff && selectedXAxisType === 'lap' && val === xHoverValue) { closestIndex = idx; }
                                    });
                                    
                                    if(currentLayout.hovermode === 'closest' && eventData.points[0].pointNumber !== undefined) {
                                        const eventPointIndex = eventData.points[0].pointNumber;
                                        if(dataForPlot.xValues[eventPointIndex] !== undefined && 
                                           Math.abs(dataForPlot.xValues[eventPointIndex] - xHoverValue) < (selectedXAxisType === 'lap' ? 0.01 : 10) ) {
                                            closestIndex = eventPointIndex;
                                        }
                                    }
                                }


                                if (closestIndex !== -1 && dataForPlot.xValues[closestIndex] !== undefined) {
                                    dataForPlot.traces.forEach(trace => {
                                        const yValue = trace.y[closestIndex];
                                        if (yValue !== undefined && yValue !== null) {
                                            const channelId = trace.channelId;
                                            const unit = channelId && channelMapping[channelId] ? (channelMapping[channelId].unit || '') : '';
                                            const xDisplayVal = hoverXFormatFunction(dataForPlot.xValues[closestIndex]);
                                            
                                            const annotationText = `${trace.name}: ${yValue.toFixed(yValue % 1 !== 0 ? 2 : 0)} ${unit}<br>${xAxisTitle}: ${xDisplayVal}`;
                                            
                                            let axVal = -40; 
                                            if (currentLayout.xaxis && currentLayout.xaxis.range && currentLayout.xaxis.range.length === 2) {
                                                const xRange = currentLayout.xaxis.range;
                                                const xHoverComparable = selectedXAxisType === 'time' ? new Date(xHoverValue).getTime() : xHoverValue;
                                                const rangeStartComparable = selectedXAxisType === 'time' ? new Date(xRange[0]).getTime() : xRange[0];
                                                const rangeEndComparable = selectedXAxisType === 'time' ? new Date(xRange[1]).getTime() : xRange[1];
                                                
                                                if (isFinite(xHoverComparable) && isFinite(rangeStartComparable) && isFinite(rangeEndComparable) && (rangeEndComparable - rangeStartComparable) > 0) {
                                                    if ( (xHoverComparable - rangeStartComparable) / (rangeEndComparable - rangeStartComparable) > 0.75 ) {
                                                        axVal = 40; 
                                                    }
                                                }
                                            }

                                            newAnnotations.push({
                                                x: xHoverValue, y: yValue, xref: 'x', yref: 'y',
                                                text: annotationText,
                                                showarrow: true, arrowhead: 0, ax: axVal, ay: -30,
                                                bgcolor: 'rgba(255, 255, 255, 0.9)', bordercolor: '#333', borderwidth:1,
                                                font: {size: 10}, name: 'hover-annotation', align: 'left'
                                            });
                                        }
                                    });
                                }
                            }
                            Plotly.relayout(plotDiv, { shapes: newShapes, annotations: newAnnotations });
                        });
                    });

                    masterPlotDiv.on('plotly_unhover', () => { /* ... (misma lógica de unhover) ... */ });
                });

            } else { 
                if (loadingPlotsMsgDiv) loadingPlotsMsgDiv.remove();
                const msg = driverTla ? `No hay datos de CarData para ${driverTla} en esta sesión.` : `Por favor, selecciona un piloto para ver su telemetría detallada.`;
                Object.values(plotDivsMap).forEach(div => { if (div) div.innerHTML = `<p class="no-data-msg">${msg}</p>`; });
            }

        } catch (error) {
            console.error("Error en displaySelectedData:", error);
            if (loadingPlotsMsgDiv) loadingPlotsMsgDiv.remove();
            plotArea.innerHTML = `<p style="color:red;">Error al cargar o procesar datos: ${error.message}. Revisa la consola.</p>`;
        }
    } 

    // --- Event Listeners ---
    // ... (Igual que en la respuesta anterior)
    yearSelect.addEventListener('change', (e) => {
        plotArea.innerHTML = "<p>Cargando...</p>";
        if (e.target.value) { loadGPsForYear(e.target.value); } 
        else { 
            resetAndDisableSelect(gpSelect); resetAndDisableSelect(sessionSelect); resetAndDisableSelect(driverSelect); 
            loadDataButton.disabled = true; plotArea.innerHTML = "<p>Selecciona un año para continuar.</p>"; 
        }
    });

    gpSelect.addEventListener('change', (e) => {
        plotArea.innerHTML = "<p>Cargando...</p>";
        if (e.target.value) { loadSessionsForGP(e.target.value); } 
        else { 
            resetAndDisableSelect(sessionSelect); resetAndDisableSelect(driverSelect); 
            loadDataButton.disabled = true; plotArea.innerHTML = "<p>Selecciona un GP para continuar.</p>"; 
        }
    });

    sessionSelect.addEventListener('change', (e) => {
        plotArea.innerHTML = "<p>Cargando...</p>";
        if (e.target.value) { const gpName = gpSelect.value; loadDriversForSession(gpName, e.target.value); } 
        else { 
            resetAndDisableSelect(driverSelect); loadDataButton.disabled = true; 
            plotArea.innerHTML = "<p>Selecciona una sesión para continuar.</p>"; 
        }
    });

    driverSelect.addEventListener('change', () => {
        if (yearSelect.value && gpSelect.value && sessionSelect.value) { loadDataButton.disabled = false; } 
        else { loadDataButton.disabled = true; }
        plotArea.innerHTML = "<p>Haz clic en 'Cargar Datos' para ver la telemetría del piloto seleccionado.</p>";
    });

    document.querySelectorAll('input[name="xAxisType"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const plotAreaHasContent = plotArea.childElementCount > 1 || 
                                     (plotArea.firstElementChild && 
                                      !plotArea.firstElementChild.id?.includes("loadingPlotsMsg") && 
                                      !plotArea.textContent.startsWith("Selecciona") &&
                                      !plotArea.textContent.startsWith("Cargando") &&
                                      !plotArea.textContent.startsWith("Error")
                                     );

            if (yearSelect.value && gpSelect.value && sessionSelect.value && !loadDataButton.disabled && plotAreaHasContent) {
                displaySelectedData();
            } else if (!plotAreaHasContent && !(yearSelect.value && gpSelect.value && sessionSelect.value)) {
                 plotArea.innerHTML = "<p>Selecciona todos los filtros y carga los datos antes de cambiar el tipo de eje X.</p>"
            }
            else if (yearSelect.value && gpSelect.value && sessionSelect.value && (loadDataButton.disabled || !plotAreaHasContent)) { // loadDataButton.disabled implica que los datos aún no se han cargado o la selección está incompleta
                plotArea.innerHTML = "<p>Carga los datos primero para poder cambiar el tipo de eje X.</p>";
            }
        });
    });
    loadDataButton.addEventListener('click', displaySelectedData);

    // --- Inicialización ---
    loadYears();
});