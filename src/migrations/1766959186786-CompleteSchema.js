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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompleteSchema1766959186786 = void 0;
var CompleteSchema1766959186786 = /** @class */ (function () {
    function CompleteSchema1766959186786() {
        this.name = 'CompleteSchema1766959186786';
    }
    CompleteSchema1766959186786.prototype.up = function (queryRunner) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryRunner.query("CREATE TABLE \"contract\" (\"id\" SERIAL NOT NULL, \"type\" character varying NOT NULL, \"date_debut\" TIMESTAMP NOT NULL, \"solde_conges\" double precision NOT NULL, \"agentId\" integer, CONSTRAINT \"PK_17c3a89f58a2997276084e706e8\" PRIMARY KEY (\"id\"))")];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("CREATE TABLE \"competency\" (\"id\" SERIAL NOT NULL, \"name\" character varying NOT NULL, \"category\" character varying NOT NULL, CONSTRAINT \"PK_9b9cd5b5654e3900e92f6956436\" PRIMARY KEY (\"id\"))")];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("CREATE TABLE \"agent_competency\" (\"id\" SERIAL NOT NULL, \"level\" integer NOT NULL, \"expirationDate\" TIMESTAMP NOT NULL, \"agentId\" integer, \"competencyId\" integer, CONSTRAINT \"PK_6a8375d1ae459e1aa1534908b0d\" PRIMARY KEY (\"id\"))")];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("CREATE TABLE \"shift\" (\"id\" SERIAL NOT NULL, \"start\" TIMESTAMP NOT NULL, \"end\" TIMESTAMP NOT NULL, \"postId\" character varying NOT NULL, \"status\" character varying NOT NULL DEFAULT 'PLANNED', \"agentId\" integer, CONSTRAINT \"PK_53071a6485a1e9dc75ec3db54b9\" PRIMARY KEY (\"id\"))")];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("CREATE TABLE \"agent\" (\"id\" SERIAL NOT NULL, \"nom\" character varying NOT NULL, \"email\" character varying NOT NULL, \"matricule\" character varying NOT NULL, \"telephone\" character varying NOT NULL, CONSTRAINT \"UQ_c8e51500f3876fa1bbd4483ecc1\" UNIQUE (\"email\"), CONSTRAINT \"UQ_c0e005072cf74273d618b9dbd09\" UNIQUE (\"matricule\"), CONSTRAINT \"PK_1000e989398c5d4ed585cf9a46f\" PRIMARY KEY (\"id\"))")];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("ALTER TABLE \"contract\" ADD CONSTRAINT \"FK_c5764ce756afc868fb188761998\" FOREIGN KEY (\"agentId\") REFERENCES \"agent\"(\"id\") ON DELETE NO ACTION ON UPDATE NO ACTION")];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("ALTER TABLE \"agent_competency\" ADD CONSTRAINT \"FK_e42937a60f8862862f0a546c2dd\" FOREIGN KEY (\"agentId\") REFERENCES \"agent\"(\"id\") ON DELETE NO ACTION ON UPDATE NO ACTION")];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("ALTER TABLE \"agent_competency\" ADD CONSTRAINT \"FK_65a995f73f1de1f96238efa108b\" FOREIGN KEY (\"competencyId\") REFERENCES \"competency\"(\"id\") ON DELETE NO ACTION ON UPDATE NO ACTION")];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("ALTER TABLE \"shift\" ADD CONSTRAINT \"FK_77b62a5d028e8230f233a860d48\" FOREIGN KEY (\"agentId\") REFERENCES \"agent\"(\"id\") ON DELETE NO ACTION ON UPDATE NO ACTION")];
                    case 9:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    CompleteSchema1766959186786.prototype.down = function (queryRunner) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryRunner.query("ALTER TABLE \"shift\" DROP CONSTRAINT \"FK_77b62a5d028e8230f233a860d48\"")];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("ALTER TABLE \"agent_competency\" DROP CONSTRAINT \"FK_65a995f73f1de1f96238efa108b\"")];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("ALTER TABLE \"agent_competency\" DROP CONSTRAINT \"FK_e42937a60f8862862f0a546c2dd\"")];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("ALTER TABLE \"contract\" DROP CONSTRAINT \"FK_c5764ce756afc868fb188761998\"")];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("DROP TABLE \"agent\"")];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("DROP TABLE \"shift\"")];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("DROP TABLE \"agent_competency\"")];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("DROP TABLE \"competency\"")];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.query("DROP TABLE \"contract\"")];
                    case 9:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return CompleteSchema1766959186786;
}());
exports.CompleteSchema1766959186786 = CompleteSchema1766959186786;
