import { Prisma } from "@prisma/client";

export function handlePrismaError(err: any) {

  let _error: any = undefined;

  if (err instanceof Prisma.PrismaClientInitializationError) {
    // This error is related to Prisma Client initialization issues (e.g., connection issues)
    _error = `Database connection error. Details:\n${err.message}`;
  } 

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // This error is related to a known request issue (e.g., invalid query, constraint violations)
    console.error('Known request error:', err.message);
    _error = `Known request error. Details:\n- message: ${err.message}\n- code: ${err.code}`;
  } 

  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    // This error is for unknown issues that Prisma can't specifically identify
    _error = `Unknown request error. Details:\n- message: ${err.message}`
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    /** 
    Prisma Client throws a PrismaClientValidationError exception if validation fails - for example:

    Missing field - for example, an empty data: {} property when creating a new record
    Incorrect field type provided (for example, setting a Boolean field to "Hello, I like cheese and gold!") 
    **/
  }

  if (!_error) _error = `Unknow Prisma Error. Details:\n${err.message}`

  // fireEmailAlert(_error);
}
