import { Request } from 'express';
import crypto from 'crypto';

class Outils {
    constructor() {
        this.base64UrlEncode = this.base64UrlEncode.bind(this);
        this.generateHeader = this.generateHeader.bind(this);
        this.generatePayload = this.generatePayload.bind(this);
        this.generateSignature = this.generateSignature.bind(this);
    }

    private base64UrlEncode(input: string): string {
        // let base64 = Buffer.from(input).toString('base64url');
        // base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // Conversion Base64 -> Base64Url
        return Buffer.from(input).toString('base64url');
    }

    // Fonction pour générer le header JWT
    private generateHeader(): string {
        const header: object = { alg: 'HS256', typ: 'JWT' };
        return this.base64UrlEncode(JSON.stringify(header));
    }

    // Fonction pour générer le payload JWT
    private generatePayload(payload: object): string {
        return this.base64UrlEncode(JSON.stringify(payload));
    }

    // Fonction pour signer le JWT avec une clé secrète
    private generateSignature(header: string, payload: string, secret: string): string {
        const data: string = `${header}.${payload}`;
        return this.base64UrlEncode(crypto.createHmac('sha256', secret).update(data).digest('hex'));
    }

    generateToken(payload: object): string {
        const header = this.generateHeader();
        const payloadBase64 = this.generatePayload(payload);
        const signature = this.generateSignature(header, payloadBase64, process.env.JWT_SECRET_KEY as string);

        return `${header}.${payloadBase64}.${signature}`;
    }

    createGrainDeSel(nombreCaractere: number): string {
        const chars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result: string = '';
        for (let i: number = 0; i < nombreCaractere; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    createNonce(datas: string) {
        let nonce: number = 0; let proofOfWork: string;
        while (true) {
            proofOfWork = crypto.createHash('sha256').update(datas + nonce).digest('hex');
            if (proofOfWork.startsWith('000')) {
                return { nonce, proofOfWork };
            }
            nonce++;
        }
    }

    verifNonce(datas: string, nonce: number, proofOfWork: string): boolean {
        let result: string = crypto.createHash('sha256').update(datas + nonce).digest('hex');
        return result === proofOfWork && result.startsWith('000');
    }

    createData(req: Request) {
        const issuedAt: number = Date.now();
        const fuseauHoraire: string = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const ipAdresse: string = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || "";
        const navigateur: string = req.headers['user-agent'] || '';
        const deviceFingerprint: string = crypto.createHash('sha256').update(ipAdresse + fuseauHoraire + navigateur).digest('hex');
        return { issuedAt, deviceFingerprint };
    }

    createExpiresIn(changement: boolean = true):number {
        let expiresIn: number
        if (changement) {
            expiresIn = Date.now() + 900000;
        }
        else {
            expiresIn = Date.now() + 30 * 24 * 60 * 60 * 1000;
        }
        return expiresIn; 
    }
}

export default Outils;