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
        
        console.log('enviando esta llave:', data)

        const urlFinal = `https://banking.sandbox.prometeoapi.com/account/?key=${data.key}`;
        const getData = await fetch( urlFinal,{
            method: 'get',
            headers: {
                'accept':'application/json',
                'X-API-Key': 'twQ0ZeEfCNgzpPW2zK7n9jQG2dBnl2LtnBDDJAx0ZVu6aBgyyp2Rm5Hu24uZIxzH',
            }
        })
        const accountsData = await getData.json();

        console.log('-CUENTAS-');
        console.log(accountsData.accounts); 
        

        const accountNumber = accountsData.accounts[1].number;
        const accountCurrency = accountsData.accounts[1].currency;

        const urlMovimientos = `https://banking.sandbox.prometeoapi.com/account/${accountNumber}/movement/?currency=${accountCurrency}&date_start=01/01/2023&date_end=31/12/2025&key=${data.key}`
        
        const getMovements = await fetch(urlMovimientos, {
            method: 'get',
            headers: {
                'accept': 'application/json',
                'X-API-Key': KEY,            
            }
        })

        const dataMovements = await getMovements.json();

    
        console.log('dice prometeo', dataMovements)
        res.json(dataMovements)
    });
    



app.listen(port, ()=>{
    console.log(`servidro dewsplegado http://localhost:${port}`)
})