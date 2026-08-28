import type { NextFunction } from "express";
import { DomainError, HttpError } from "../errors/errors.ts";

export const handleControllerError = (error: unknown, next: NextFunction): void => {
    if (!(error instanceof DomainError)) {
        next(error);
        return;
    }

    const status = error.message === "Ressource introuvable"
        ? 404
        : /existe déjà|déjà passé|refusé|hors de sa fenêtre/.test(error.message)
            ? 409
            : 400;
    next(new HttpError(status, error.message));
};