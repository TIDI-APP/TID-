const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const belvo = require('belvo').default;

const client = new belvo(
    '5adf3fb1-3a21-4c2e-9cdb-201d23999410',
    'z8Va8oTfNHEDgR*IUTRq#7@E#@L-xD7oeMejVhEviTrxMmmGw@fg2nZCjdyFe9mv',
    'sandbox'
);

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/api/token', async(req, res) =>{
    try {
        const token = await client.widgetToken.create();
        res.json(token);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al crear el token");
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor listo en http://localhost:${port}`);
});