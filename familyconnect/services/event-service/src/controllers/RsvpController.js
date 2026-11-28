import { RsvpService } from '../services/RsvpService.js';
import { EventService } from '../services/EventService.js';
import { RsvpRepository } from '../repositories/RsvpRepository.js';
import { GenealogyClient } from '../clients/GenealogyClient.js';
import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import { AppError } from '../../../../shared/src/AppError.js';

export class RsvpController {

    static async findByEvent(req, res) {
        const eventId = req.query.event_id;

        if (!eventId) {
            throw new AppError(400, 'Event ID is required');
        }

        const event = await EventService.findById(eventId);

        await GenealogyClient.requireMembership(
            req.user,
            event.family_id
        );

        const rsvps = await RsvpService.findByEvent(eventId);

        return ApiResponse.ok(res, rsvps);
    }

    static async createOrUpdate(req, res) {
        const event = await EventService.findById(
            req.body.event_id
        );

        await GenealogyClient.requireMembership(
            req.user,
            event.family_id
        );

        const result = await RsvpService.createOrUpdate({
            ...req.body,
            user_id: req.user.userId
        });

        const { inserted, ...rsvp } = result;

        return inserted
            ? ApiResponse.created(res, rsvp)
            : ApiResponse.ok(res, rsvp);
    }

    static async delete(req, res) {
        const rsvp = await RsvpRepository.findById(
            req.params.id
        );

        if (!rsvp) {
            throw new AppError(404, 'RSVP not found');
        }

        const event = await EventService.findById(
            rsvp.event_id
        );

        await GenealogyClient.requireMembership(
            req.user,
            event.family_id
        );

        if (
            req.user.role !== 'SYSTEM_ADMIN' &&
            String(rsvp.user_id) !== String(req.user.userId)
        ) {
            throw new AppError(403, 'Forbidden');
        }

        await RsvpService.delete(req.params.id);

        return res.status(200).json({
            success: true,
            status_code: 200,
            message: 'RSVP deleted',
            data: null
        });
    }
}