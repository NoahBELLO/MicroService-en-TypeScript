import { Request, Response } from 'express';
import { Collection, ObjectId } from 'mongodb';
import Outils from './outils';
import crypto from 'crypto';

const outils = new Outils();
// Interface pour la création de l'utilisateur
interface UtilisateurCréation {
    nom: string; prenom: string;
    adresseMail: string; grainDeSel: string;
    role: string;
}

interface UtilisateurModifier {
    mdpHasher: string;
}

interface PayloadAccess {
    userId: ObjectId; role: string;
    issuedAt: number; expiresIn: number;
    nonce: number; proofOfWork: string;
    scope: string[]; issuer: string;
    deviceFingerprint: string;
}

interface PayloadRefresh {
    userId: ObjectId;
    issuedAt: number;
    expiresIn: number;
}

interface Tokens {
    userId: ObjectId;
    tokenAccess: string;
    tokenRefresh: string;
}

let utilisateurModel: Collection;
let tokenModel: Collection;
class UserController {
    init(collection: Collection, collection2: Collection): void {
        utilisateurModel = collection;
        tokenModel = collection2;
    };

    async getAllUsers(req: Request, res: Response): Promise<void> {
        try {
            let users = await utilisateurModel.find({}).toArray();
            if (!users) {
                throw new Error("Liste utilisateur non trouvée");
            }
            res.status(201).json(users);
        }
        catch (err) {
            res.status(500).json({ message: "Aucun utilisateur trouver" });
        }
    }

    async getUser(req: Request, res: Response): Promise<void> {
        try {
            let { email } = req.body;
            if (!email) {
                throw new Error("Email manquant");
            }

            let user = await utilisateurModel.findOne({ adresseMail: email });
            if (!user) {
                throw new Error("Utilisateur non trouvée");
            }
            res.status(201).json(user);
        }
        catch (err) {
            res.status(500).json({ message: "Aucun utilisateur trouver" });
        }
    }

    async createUser(req: Request, res: Response): Promise<void> {
        try {
            const { nom, prenom, adresseMail, role } = req.body;
            if (!nom || !prenom || !adresseMail || !role) {
                throw new Error("Information manquant");
            }

            let nombreCaractererAleatoire: number = Math.floor(Math.random() * 20) + 1;
            const grainDeSel: string = outils.createGrainDeSel(nombreCaractererAleatoire);
            if (!grainDeSel) {
                throw new Error("Erreur lors de la création du grain de sel");
            }

            let newUtilisateur: UtilisateurCréation = { nom, prenom, adresseMail, grainDeSel, role };
            if (!newUtilisateur) {
                throw new Error("Information manquant");
            }

            let user = await utilisateurModel.insertOne(newUtilisateur);
            if (!user) {
                throw new Error("Utilisateur non crée");
            }

            res.status(201).json({ grainDeSel: grainDeSel });
        }
        catch (err) {
            res.status(500).json({ message: "Aucun utilisateur crée" });
        }
    }

    async updateUser(req: Request, res: Response): Promise<void> {
        try {
            // Récupérer le mot de passe hasher en FrontEnd
            const { adresseMail, grainDeSel, motDePasse, /* mdpHasher */ } = req.body;
            if (!adresseMail || !grainDeSel || !motDePasse) {
                throw new Error("Information manquant");
            }
            // Hasher le mot de passe en FrontEnd
            const mdpHasher = crypto.createHash('sha256').update(motDePasse + grainDeSel).digest('hex');
            if (!mdpHasher) {
                throw new Error("Erreur lors de la création du hash du mot de passe");
            }
            let updateUtilisateur: UtilisateurModifier = { mdpHasher };
            if (!updateUtilisateur) {
                throw new Error("Information manquant");
            }

            const result = await utilisateurModel.updateOne(
                { adresseMail: adresseMail },
                { $set: updateUtilisateur }
            );
            if (result.modifiedCount === 0) {
                throw new Error("Aucun utilisateur mis à jour");
            }

            const { issuedAt, deviceFingerprint } = outils.createData(req);
            if (!issuedAt || !deviceFingerprint) {
                throw new Error("Erreur lors de la création des données de token");
            }

            const expiresInAccess: number = outils.createExpiresIn();
            if (!expiresInAccess) {
                throw new Error("Erreur lors de la création de l'expiration de l'accès");
            }

            const user = await utilisateurModel.findOne({ adresseMail: adresseMail });
            if (!user) {
                throw new Error("Utilisateur non trouvée");
            }

            const data: string = `${user._id}${user.role}${issuedAt}${expiresInAccess}${deviceFingerprint}`;
            const { nonce, proofOfWork } = outils.createNonce(data);
            if (!nonce || !proofOfWork) {
                throw new Error("Erreur lors de la création des données de nonce et proofOfWork");
            }

            const payloadAccess: PayloadAccess = {
                userId: user._id, role: user.role,
                issuedAt, expiresIn: expiresInAccess, nonce, proofOfWork,
                scope: ['read', 'write'], issuer: "authServer",
                deviceFingerprint
            }

            const tokenAccess: string = outils.generateToken(payloadAccess);
            if (!tokenAccess) {
                throw new Error("Erreur lors de la création du token");
            }

            const expiresInRefresh: number = outils.createExpiresIn(false);
            if (!expiresInRefresh) {
                throw new Error("Erreur lors de la création de l'expiration du rafraichissement");
            }

            const payloadRefresh: PayloadRefresh = { userId: user._id, issuedAt, expiresIn: expiresInRefresh };
            const tokenRefresh: string = outils.generateToken(payloadRefresh);
            if (!tokenRefresh) {
                throw new Error("Erreur lors de la création du token");
            }

            const tokenObjet: Tokens = { userId: user._id, tokenAccess, tokenRefresh }
            if (!tokenObjet) {
                throw new Error("Erreur lors de la création du token dans la base de données");
            }

            let tokenBDD = await tokenModel.updateOne(
                { userId: user._id },
                { $set: tokenObjet }
            );
            if (!tokenBDD.modifiedCount) {
                throw new Error("Aucun token mis à jour");
            }

            res.status(201).json({ tokenAccess: tokenAccess, tokenRefresh: tokenRefresh });
        }
        catch (err) {
            res.status(500).json({ message: "Aucun utilisateur mis à jour" });
        }
    }

    async deleteUser() { }

    async login(req: Request, res: Response): Promise<void> {
        try {
            // Récupérer le mot de passe hasher en FrontEnd
            let { adresseMail, motDePasse, /* mdpHasher */ } = req.body;
            if (!adresseMail /* || !mdpHasher */ || !motDePasse) {
                throw new Error("Information manquant");
            }

            const user = await utilisateurModel.findOne({ adresseMail: adresseMail });
            if (!user) {
                throw new Error("Utilisateur non trouvée");
            }

            // Hasher le mot de passe en FrontEnd
            // const mdpHasher = crypto.createHash('sha256').update(motDePasse + user.grainDeSel).digest('hex');
            // if (!mdpHasher) {
            //     throw new Error("Erreur lors de la création du hash du mot de passe");
            // }

            const compareMdpHasher = crypto.createHash('sha256').update(motDePasse + user.grainDeSel).digest('hex');
            if (compareMdpHasher !== user.mdpHasher) {
                throw new Error("Mauvais mot de passe");
            }

            const { issuedAt, deviceFingerprint } = outils.createData(req);
            if (!issuedAt || !deviceFingerprint) {
                throw new Error("Erreur lors de la création des données de token");
            }

            const expiresInAccess: number = outils.createExpiresIn();
            if (!expiresInAccess) {
                throw new Error("Erreur lors de la création de l'expiration de l'accès");
            }

            const data: string = `${user._id}${user.role}${issuedAt}${expiresInAccess}${deviceFingerprint}`;
            const { nonce, proofOfWork } = outils.createNonce(data);
            if (!nonce || !proofOfWork) {
                throw new Error("Erreur lors de la création des données de nonce et proofOfWork");
            }

            const payloadAccess: PayloadAccess = {
                userId: user._id, role: user.role,
                issuedAt, expiresIn: expiresInAccess, nonce, proofOfWork,
                scope: ['read', 'write'], issuer: "authServer",
                deviceFingerprint
            }

            const tokenAccess: string = outils.generateToken(payloadAccess);
            if (!tokenAccess) {
                throw new Error("Erreur lors de la création du token");
            }

            const expiresInRefresh: number = outils.createExpiresIn(false);
            if (!expiresInRefresh) {
                throw new Error("Erreur lors de la création de l'expiration du rafraichissement");
            }

            const payloadRefresh: PayloadRefresh = { userId: user._id, issuedAt, expiresIn: expiresInRefresh };
            const tokenRefresh: string = outils.generateToken(payloadRefresh);
            if (!tokenRefresh) {
                throw new Error("Erreur lors de la création du token");
            }

            const tokenObjet: Tokens = { userId: user._id, tokenAccess, tokenRefresh }
            if (!tokenObjet) {
                throw new Error("Erreur lors de la création du token dans la base de données");
            }

            let tokenBDD = await tokenModel.updateOne(
                { userId: user._id },
                { $set: tokenObjet }
            );
            if (!tokenBDD.modifiedCount) {
                throw new Error("Aucun token mis à jour");
            }

            res.status(201).json({ tokenAccess: tokenAccess, tokenRefresh: tokenRefresh });
        }
        catch (err) {
            res.status(500).json({ message: "Aucun utilisateur mis à jour" });
        }
    }
}
export default UserController;