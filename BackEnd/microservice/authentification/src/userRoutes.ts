import { Request, Response } from 'express';
export default (req: Request, res: Response) => {
    res.status(500).json({ message: "Erreur interne du serveur" });
};