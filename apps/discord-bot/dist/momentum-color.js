"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MomentumColor = void 0;
function colorValue(r, g, b) {
    return (r << 16) + (g << 8) + b;
}
var MomentumColor;
(function (MomentumColor) {
    MomentumColor[MomentumColor["Gray"] = colorValue(55, 55, 55)] = "Gray";
    MomentumColor[MomentumColor["DarkGray"] = colorValue(42, 42, 42)] = "DarkGray";
    MomentumColor[MomentumColor["DarkestGray"] = colorValue(32, 32, 32)] = "DarkestGray";
    MomentumColor[MomentumColor["LightGray"] = colorValue(65, 65, 65)] = "LightGray";
    MomentumColor[MomentumColor["LighterGray"] = colorValue(79, 79, 79)] = "LighterGray";
    MomentumColor[MomentumColor["LightererGray"] = colorValue(95, 95, 95)] = "LightererGray";
    MomentumColor[MomentumColor["LighterererGray"] = colorValue(130, 130, 130)] = "LighterererGray";
    MomentumColor[MomentumColor["LightestGray"] = colorValue(200, 200, 200)] = "LightestGray";
    MomentumColor[MomentumColor["Red"] = colorValue(255, 106, 106)] = "Red";
    MomentumColor[MomentumColor["Green"] = colorValue(153, 255, 153)] = "Green";
    MomentumColor[MomentumColor["Blue"] = colorValue(24, 150, 211)] = "Blue";
    MomentumColor[MomentumColor["GrayBlue"] = colorValue(76, 139, 180)] = "GrayBlue";
})(MomentumColor || (exports.MomentumColor = MomentumColor = {}));
