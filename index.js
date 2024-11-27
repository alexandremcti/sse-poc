import express, { json } from 'express'
import { readFile, writeFile } from 'fs/promises';
import { join} from 'path'

const app = express()
app.use(json())
const file = join(process.cwd(), 'database.json');
console.log('filePath', file);

const getData = async () => {
    const data = JSON.parse(await readFile(file));
    console.log(data);
    return data;
}

const saveData = async (data) => {
    const content = JSON.parse(await readFile(file));
    console.log('content', content);
    const event = content.events[data.correlationId]
    if(!event){
        content.events[data.correlationId] = data
        content.totalRecords++
    } else {
        content.events[data.correlationId] = data
    }
    await writeFile(file, JSON.stringify(content))
}

app.post('/events', async (req, res) => {
    const {body} = req;
    const {correlationId} = body
    await saveData({correlationId, timestamp: new Date(), processed: false})
    res.status(200).json({message: 'ok'})
})

app.get('/events', async (req, res) => {
    const {query} = req;
    const {correlationId} = query;
    console.log('correlationId', correlationId)

    res.setHeader('Content-type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const records = await getData();
    const event = records.events[correlationId]

    if(!event){
        res.write(`data: ${JSON.stringify({message: `evento ${correlationId} não encontrado`, code: 'notfound'})}`);
    } else {
        event.processed = true
        await saveData(event)
        res.write(`data: ${JSON.stringify({message: `evento ${correlationId} encontrado`, event: JSON.stringify(event), code: 'ok'})}`);
        res.end()
    }


    req.on('close', () => {
        console.log('Conexão encerrada');
        res.end();
    })
})

app.listen(3000, () => console.log('servidor rodando'))
app.on('close', () => {
    process.exit(0)
})