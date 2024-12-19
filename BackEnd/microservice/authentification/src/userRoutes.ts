import { Router, Request, Response } from 'express';
import UserController from "./userController";
import authMiddleware from "./authMiddelware";
const router: Router = Router();

const userController: UserController = new UserController();
// router.get("/bonjour", authMiddleware, (req, res) => {
//     res.send("Bonjour");
// });
router.get('/', userController.getAllUsers);
router.post('/', userController.getUser);
router.post('/inscription', userController.createUser);
router.put('/updateUser', userController.updateUser);
// router.delete('/deleteUser/:id', userController.deleteUser);
router.post('/login', userController.login);

export default router;