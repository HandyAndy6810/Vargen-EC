/**
 * multer ships no types of its own and `@types/multer` is not installed, so every
 * import of it was an implicit-any error.
 *
 * This is a stopgap, not the fix. It was added from an environment with no network
 * access, where `npm i -D @types/multer` could not be run and the lockfile could not
 * be updated — and `npm ci` in CI refuses a package.json that disagrees with its
 * lockfile.
 *
 * TO DO PROPERLY: on a machine with network, run
 *
 *   npm i -D @types/multer
 *
 * and delete this file. That gives real types on `req.file` / `req.files`, which
 * matter: the audio upload route reads them, and today they are untyped.
 */
declare module 'multer';
