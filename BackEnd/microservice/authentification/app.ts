import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, Collection, Db } from 'mongodb';
import userRoutes from "./src/userRoutes";
import UserController from "./src/userController";
import 'dotenv/config';
import "./src/userController";

dotenv.config();
const app: Application = express();
const port: number = 3000;

const userController: UserController = new UserController();

const uri: string = process.env.MONGO_URI_Noah as string;

const client: MongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function run(): Promise<void> {
  try {
    // Connexion à la base de données
    await client.connect();
    const database: Db = client.db("BDDExpress");

    const collection: Collection = database.collection("utilisateurs");
    const collection2: Collection = database.collection("tokens");

    // Initialiser le contrôleur avec les collections MongoDB
    userController.init(collection, collection2);

    // Partager la collection des tokens dans les middlewares
    // app.set("tokensCollection", collection2);

    // Ajouter les routes utilisateur
    app.use("/utilisateur", userRoutes);

    // Middleware pour gérer les erreurs 500 (erreurs serveur)
    app.use(
      (err: Error, req: Request, res: Response, next: NextFunction): void => {
        console.error(err.stack);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    );

    // Démarrer le serveur
    app.listen(port, (): void => {
      console.log(`API en cours d'exécution sur http://localhost:${port}`);
    });
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);