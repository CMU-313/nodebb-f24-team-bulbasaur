J$.iids = {"8":[6,5,6,28],"9":[1,1,1,13],"10":[6,5,6,28],"17":[1,1,1,14],"25":[6,5,6,12],"33":[6,5,6,17],"41":[6,22,6,28],"49":[7,2,7,9],"57":[7,2,7,14],"65":[8,10,8,17],"73":[8,18,8,22],"81":[8,10,8,23],"89":[8,10,8,23],"97":[8,3,8,24],"105":[7,25,9,3],"113":[7,25,9,3],"121":[7,25,9,3],"129":[7,25,9,3],"137":[7,2,9,3],"145":[7,2,9,4],"153":[1,1,11,1],"161":[7,25,9,3],"169":[7,25,9,3],"177":[6,1,10,2],"185":[1,1,11,1],"193":[1,1,11,1],"nBranches":2,"originalCodeFileName":"require-main.js","instrumentedCodeFileName":"require-main_jalangi_.js","code":"'use strict';\n\n// this forces `require.main.require` to always be relative to this directory\n// this allows plugins to use `require.main.require` to reference NodeBB modules\n// without worrying about multiple parent modules\nif (require.main !== module) {\n\trequire.main.require = function (path) {\n\t\treturn require(path);\n\t};\n}\n"};
jalangiLabel1:
    while (true) {
        try {
            J$.Se(153, 'require-main_jalangi_.js', 'require-main.js');
            J$.X1(17, J$.T(9, 'use strict', 21, false));
            if (J$.X1(177, J$.C(8, J$.B(10, '!==', J$.G(33, J$.R(25, 'require', require, 2), 'main', 0), J$.R(41, 'module', module, 2), 0)))) {
                J$.X1(145, J$.P(137, J$.G(57, J$.R(49, 'require', require, 2), 'main', 0), 'require', J$.T(129, function (path) {
                    jalangiLabel0:
                        while (true) {
                            try {
                                J$.Fe(105, arguments.callee, this, arguments);
                                arguments = J$.N(113, 'arguments', arguments, 4);
                                path = J$.N(121, 'path', path, 4);
                                return J$.X1(97, J$.Rt(89, J$.F(81, J$.R(65, 'require', require, 2), 0)(J$.R(73, 'path', path, 0))));
                            } catch (J$e) {
                                J$.Ex(161, J$e);
                            } finally {
                                if (J$.Fr(169))
                                    continue jalangiLabel0;
                                else
                                    return J$.Ra();
                            }
                        }
                }, 12, false, 105), 0));
            }
        } catch (J$e) {
            J$.Ex(185, J$e);
        } finally {
            if (J$.Sr(193)) {
                J$.L();
                continue jalangiLabel1;
            } else {
                J$.L();
                break jalangiLabel1;
            }
        }
    }
// JALANGI DO NOT INSTRUMENT
