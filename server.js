const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000


app.use(cors());
app.use(bodyParser.json());

app.get('/api/test-prometeo', async (req, res) =>{
        const KEY = "twQ0ZeEfCNgzpPW2zK7n9jQG2dBnl2LtnBDDJAx0ZVu6aBgyyp2Rm5Hu24uZIxzH"
        let params = new URLSearchParams()
        params.append('provider','test')
        params.append('username','12345')
        params.append('password','gfdsa')

        const respuesta = await fetch('https://banking.sandbox.prometeoapi.com/login/',{
            method: 'post',
            headers: {
            'X-API-Key' : KEY,
            'accept' : 'application/json',
            'content-type' : 'application/x-www-form-urlencoded'
            },
            body: params
        })
        const data = await respuesta.json()
        
        console.log('enviando esta llave:', data.key)
        const getData = await fetch('https://banking.sandbox.prometeoapi.com/account/test/',{
            method: 'get',
            headers: {
                'X-API-Key': KEY,
                'Key': data.key
            }
        })
        const rawData = await getData.text(); // Lo leemos como texto simple
        console.log("Respuesta bruta del banco:", rawData); // <--- Esto es clave
        res.json(data)

        
    });
    



app.listen(port, ()=>{
    console.log(`servidro dewsplegado http://localhost:${port}`)
})