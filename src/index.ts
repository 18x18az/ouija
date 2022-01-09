import ReconnectingWebSocket from "reconnecting-websocket";
import BaseSocket from "isomorphic-ws";
import { MESSAGE_TYPE, IPath, IMessage } from "@18x18az/rosetta";

export interface IConnectionCb {
    (): IMessage | null;
}

export interface IMessageCb {
    (p: IPath, payload?: any): IMessage | null
}

function dummyConnectionCb() {
    return null;
}

function dummyMessageCb(p: IPath, payload: any) {
    return null;
}

export class Websocket {
    private ws: any;
    private hasConnected: boolean = false;

    public initialConnectCb: IConnectionCb = dummyConnectionCb;
    public connectCb: IConnectionCb = dummyConnectionCb;

    public getCb: IMessageCb = dummyMessageCb;
    public postCb: IMessageCb = dummyMessageCb;

    constructor(url: string) {
        const options = {
            WebSocket: BaseSocket
        }

        this.ws = new ReconnectingWebSocket(url, [], options);
        this.ws.addEventListener('open', this.#connect.bind(this))
        this.ws.onmessage = this.#messageHandler.bind(this);
    }

    #messageHandler(event: any) {
        const data = JSON.parse(event.data) as IMessage;
        const type = data.type;
        let response = null;
        if (type === MESSAGE_TYPE.GET) {
            response = this.getCb(data.path);
        } else if (type === MESSAGE_TYPE.POST) {
            response = this.postCb(data.path, data.payload);
        } else {
            console.log(`Unhandled type ${type}`);
        }

        if (response) {
            this.#send(response);
        }
    }

    #connect() {
        console.log("Connected to the server");
        if (!this.hasConnected) {
            const initialMessage = this.#initialConnect();
        }

        const message = this.connectCb();
        if(message){
            this.#send(message);
        }
    }

    #initialConnect() {
        console.log("Initial connection");
        this.hasConnected = true;
        const initialMessage = this.initialConnectCb();
        if(initialMessage){
            this.#send(initialMessage);
        }
    }

    post(path: IPath, payload: any) {
        this.#send({
            type: MESSAGE_TYPE.POST,
            path,
            payload
        });
    }

    get(path: IPath) {
        this.#send({
            type: MESSAGE_TYPE.GET,
            path
        });
    }

    #send(message: IMessage) {
        this.ws.send(JSON.stringify(message));
    }
}
