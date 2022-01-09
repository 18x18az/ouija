import ReconnectingWebSocket from "reconnecting-websocket";
import BaseSocket from "isomorphic-ws";
import { MESSAGE_TYPE, IPath, IMessage } from "@18x18az/rosetta";

type MultiMessage = IMessage | Array <IMessage> | null
export interface IConnectionCb {
    (): MultiMessage;
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

    #sendMulti(data: MultiMessage){
        if(data){
            if(Array.isArray(data)){
                data.forEach(message => this.#send(message));
            } else {
                this.#send(data);
            }
        }
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
            this.#initialConnect();
        }

        const message = this.connectCb();
        this.#sendMulti(message);
    }

    #initialConnect() {
        console.log("Initial connection");
        this.hasConnected = true;
        const initialMessage = this.initialConnectCb();
        this.#sendMulti(initialMessage);
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
