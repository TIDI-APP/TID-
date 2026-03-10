const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/api/test-prometeo', async (req, res) => {
    let conexionDB;
    try {
        conexionDB = await mysql.createConnection({
            host: '157.180.40.190',
            user: 'root',
            password: 'scORHWprCvp26Gz1zwPQgSsokHyPC2',
            database: 'tidi_database'
        });

        const KEY = "twQ0ZeEfCNgzpPW2zK7n9jQG2dBnl2LtnBDDJAx0ZVu6aBgyyp2Rm5Hu24uZIxzH";
        let params = new URLSearchParams();
        params.append('provider', 'test');
        params.append('username', '12345');
        params.append('password', 'gfdsa');

        const respuesta = await fetch('https://banking.sandbox.prometeoapi.com/login/', {
            method: 'post',
            headers: {
                'X-API-Key': KEY,
                'accept': 'application/json',
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: params
        });
        
        if (!respuesta.ok) throw new Error("Fallo en login con Prometeo");
        const data = await respuesta.json();

        const urlFinal = `https://banking.sandbox.prometeoapi.com/account/?key=${data.key}`;
        const getData = await fetch(urlFinal, {
            method: 'get',
            headers: {
                'accept': 'application/json',
                'X-API-Key': KEY,
            }
        });
        
        if (!getData.ok) throw new Error("Fallo al obtener cuentas");
        const accountsData = await getData.json();

        // Extraemos la cuenta USD completa
        const cuentaSeleccionada = accountsData.accounts[1];

        // Guardamos la cuenta en la BD (omitimos id_local para que se autogenere)
        const sqlCuenta = 'INSERT IGNORE INTO accounts (prometeo_id, name, number, currency, balance) VALUES (?, ?, ?, ?, ?)';
        await conexionDB.query(sqlCuenta, [
            cuentaSeleccionada.id, 
            cuentaSeleccionada.name, 
            cuentaSeleccionada.number, 
            cuentaSeleccionada.currency, 
            cuentaSeleccionada.balance
        ]);

        const urlMovimientos = `https://banking.sandbox.prometeoapi.com/account/${cuentaSeleccionada.number}/movement/?currency=${cuentaSeleccionada.currency}&date_start=01/01/2023&date_end=31/12/2025&key=${data.key}`;
        
        const getMovements = await fetch(urlMovimientos, {
            method: 'get',
            headers: {
                'accept': 'application/json',
                'X-API-Key': KEY,
            }
        });

        if (!getMovements.ok) {
            const errorText = await getMovements.text();
            throw new Error(`Prometeo dice: Error ${getMovements.status} - ${errorText}`);
        }
        const dataMovements = await getMovements.json();
        
        const movimientos = dataMovements.movements || [];

        // Preparamos los datos para la tabla de movimientos
        const valoresParaInsertar = movimientos.map(mov => {
            const partes = mov.date.split('/');
            const fechaMySQL = `${partes[2]}-${partes[1]}-${partes[0]}`;
            const debitSQL = mov.debit === '' ? 0 : parseFloat(mov.debit);
            const creditSQL = mov.credit === '' ? 0 : parseFloat(mov.credit);

            return [mov.id, cuentaSeleccionada.id, mov.reference, fechaMySQL, mov.detail, debitSQL, creditSQL];
        });

        if (valoresParaInsertar.length > 0) {
            const sqlMovimientos = 'INSERT IGNORE INTO movements (prometeo_id, account_id, reference, date, detail, debit, credit) VALUES ?';
            await conexionDB.query(sqlMovimientos, [valoresParaInsertar]);
        }

        await conexionDB.end();

        res.json({ status: 'success', message: 'Cuentas y movimientos guardados con Auto-Increment exitosamente' });

    } catch (error) {
        if (conexionDB) await conexionDB.end();
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});



app.get('/api/calcular-credito', async(req,res)=>{
    let connectioDB;
    try{
        conexionDB = await mysql.createConnection({
            host: '157.180.40.190',
            user: 'root',
            password: 'scORHWprCvp26Gz1zwPQgSsokHyPC2',
            database: 'tidi_database'
        });

        // 1. Consultamos el promedio en dólares
        const sqlCalculo = `
            SELECT AVG(credit) AS promedio_ingresos 
            FROM movements 
            WHERE detail LIKE '%sueldo%';
        `;
        const [resultados] = await conexionDB.query(sqlCalculo);
        const promedioSueldoUSD = resultados[0].promedio_ingresos || 0;

        // 2. Tasa de cambio estática
        const valorDolar = 3500;
        
        // 3. Conversión y regla de negocio
        const promedioPesos = promedioSueldoUSD * valorDolar;
        const disponible = promedioPesos / 2;
        const factorPrestamo = disponible / 24100;
        const prestamoAprobado = factorPrestamo * 1000000;

        await conexionDB.end();

        // 4. Enviamos la respuesta estructurada al frontend
        res.json({
            status: 'success',
            promedio_ingresos_usd: promedioSueldoUSD,
            promedio_ingresos_cop: promedioPesos,
            cupo_aprobado: prestamoAprobado
        });

    } catch (error) {
        if (conexionDB) await conexionDB.end();
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`servidor desplegado http://localhost:${port}`);
});