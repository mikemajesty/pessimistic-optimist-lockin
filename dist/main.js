"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const app = (0, express_1.default)();
const pool = new pg_1.Pool({
    user: 'admin',
    password: 'admin',
    host: 'localhost',
    port: 5432,
    database: 'db-transaction'
});
const buyOptimisticLockIn = (connect) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const data = yield connect.query('SELECT amount,version FROM stock where id = 1');
    const { amount, version } = ((_a = data === null || data === void 0 ? void 0 : data.rows) === null || _a === void 0 ? void 0 : _a.find(Boolean)) || {};
    if (!amount || amount <= 0) {
        console.log('nothing to buy');
        return;
    }
    try {
        yield pool.query('BEGIN');
        yield connect.query('UPDATE stock SET amount = amount - 1, version = version + 1 WHERE id =1 AND version=' + version);
        yield pool.query('COMMIT');
    }
    catch (error) {
        yield pool.query('ROLLBACK');
    }
});
const buyPessimisticLockIn = (connect) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c;
    const data = yield connect.query('SELECT amount FROM stock where id = 1 FOR UPDATE');
    const amount = (_c = (_b = data === null || data === void 0 ? void 0 : data.rows) === null || _b === void 0 ? void 0 : _b.find(Boolean)) === null || _c === void 0 ? void 0 : _c.amount;
    if (!amount || amount <= 0) {
        console.log('nothing to buy');
        return;
    }
    try {
        yield pool.query('BEGIN');
        yield pool.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE READ');
        yield connect.query('UPDATE stock SET amount = amount - 1 WHERE id =1');
        yield pool.query('COMMIT');
    }
    catch (error) {
        yield pool.query('ROLLBACK');
    }
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    const connect = yield pool.connect();
    yield connect.query(`CREATE TABLE IF NOT EXISTS stock
  (
    id integer PRIMARY KEY,
    amount integer,
    version integer
  )`);
    app.listen(5000, () => {
        console.log('Server is running on port 5000');
    });
    yield buyOptimisticLockIn(connect);
}))();
