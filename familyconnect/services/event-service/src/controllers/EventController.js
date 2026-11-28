import { EventService } from '../services/EventService.js';
import { GenealogyClient } from '../clients/GenealogyClient.js';
import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import { AppError } from '../../../../shared/src/AppError.js';

export class EventController {

    static async findAll(req, res) {
        const familyId = req.query.family_id;

        if (!familyId) {
            throw new AppError(400, 'Family ID is required');
        }

        await GenealogyClient.requireMembership(req.user, familyId);

        const events = await EventService.findAll(familyId);

        return ApiResponse.ok(res, events);
    }

    static async findById(req, res) {
        const event = await EventService.findById(req.params.id);

        await GenealogyClient.requireMembership(
            req.user,
            event.family_id
        );

        return ApiResponse.ok(res, event);
    }

    static async create(req, res) {
        await GenealogyClient.requireMembership(
            req.user,
            req.body.family_id
        );

        const event = await EventService.create({
            ...req.body,
            user_id: req.user.userId
        });

        return ApiResponse.created(res, event);
    }

    static async update(req, res) {
        const event = await EventService.findById(req.params.id);

        await GenealogyClient.requireMembership(
            req.user,
            event.family_id
        );

        if (
            req.user.role !== 'SYSTEM_ADMIN' &&
            String(event.user_id) !== String(req.user.userId)
        ) {
            throw new AppError(403, 'Forbidden');
        }

        const updatedEvent = await EventService.update(
            req.params.id,
            req.body
        );

        return ApiResponse.ok(res, updatedEvent);
    }

    static async delete(req, res) {
        const event = await EventService.findById(req.params.id);

        await GenealogyClient.requireMembership(
            req.user,
            event.family_id
        );

        const isOwner =
            String(event.user_id) === String(req.user.userId);

        const isAdmin = ['SYSTEM_ADMIN', 'FAMILY_ADMIN']
            .includes(req.user.role);

        if (!isOwner && !isAdmin) {
            throw new AppError(403, 'Forbidden');
        }

        await EventService.delete(req.params.id);

        return res.status(200).json({
            success: true,
            status_code: 200,
            message: 'Event deleted',
            data: null
        });
    }
}