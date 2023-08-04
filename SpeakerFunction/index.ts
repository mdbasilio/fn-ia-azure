import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as fs from 'fs';
import axios, { AxiosResponse } from "axios";
import { promisify } from 'util';

const sleep = promisify(setTimeout);

const configPath = 'config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const apiKey = config.apiKey;
const url_hablante = config.url_hablante;
const url_botsonic = config.url_botsonic;
const authorization = config.authorization;

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const result = {
        status: 200,
        body: '',
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    };

    context.log("Inicio de la función.");

    const data = req.body;
    const body = {
        "question": data.text,
        "chat_history": []
    };

    const headers = {
        'key': 'token',
        'token': apiKey
    };

    try {
        const response: AxiosResponse = await axios.post(url_botsonic, body, { headers });
        context.log("Botsonic info:", !!response.data);
        const answer = response.data[0].data.answer;
        
        const id = await httpCrearHablante(answer);
        context.log("Hablante ID:", id);

        await sleep(150);

        const videoRes = await httpObtenerHablante(id);
        context.log("Video:", videoRes.result_url);

        result.body = JSON.stringify({ result_url: videoRes.result_url });

        context.res = result;
    } catch (error) {
        context.log.error("An error occurred:", error);
        result.status = 500;
        result.body = "An error ocurred";
        context.res = result;
    } finally {
        context.log("Fin de Función.");
    }
};

const httpCrearHablante = async (text: string): Promise<string> => {
    const data = {
        script: {
            type: 'text',
            provider: {
                type: 'microsoft',
                voice_id: 'es-EC-LuisNeural'
            },
            subtitles: false,
            input: text
        },
        source_url: 'https://iroutestorageface.blob.core.windows.net/fotos/0725202310445778DavidDuenas.JPG',
        driver_url: 'bank://lively/driver-06/original',
        webhook: 'https://iroutepociasite.z20.web.core.windows.net'
    };

    const headers = {
        'Authorization': authorization
    };

    try {
        const response: AxiosResponse = await axios.post(url_hablante, data, { headers });
        const resp = response.data.id;
        return resp;
    } catch (error) {
        throw new Error(`Not Created talk: ${error}`);
    }
};


const httpObtenerHablante = async (id: string): Promise<any> => {
    const url = `${url_hablante}/${id}`;

    const headers = {
        'Authorization': authorization
    };

    while (true) {
        try {
            const response: AxiosResponse = await axios.get(url, { headers });
            if (response.data && response.data.result_url) {
                const videoUrl = response.data;
                return videoUrl;
            }
        } catch (error) {
            throw new Error("An error occurred getting video");
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }
};

export default httpTrigger;