const puppeteer = require('puppeteer');
const ora = require('ora');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const spinner = ora({ color: 'blue' });

const spiderUrl = "http://www.mca.gov.cn/article/sj/xzqh/2020/2020/202003301019.html";


(async () => {
    spinner.start(chalk.green('开始抓取省数据...'));

    const browser = await puppeteer.launch({headless:true, timeout: 3000});
    const page = await browser.newPage();

    await page.goto(spiderUrl)

    let urbanArr = await page.evaluate(() => {
        urbanList = [...document.querySelectorAll('tbody tr')];
        formatList = [];
        urbanList.forEach(el => {
            formatList.push(el.innerText.trim())
        });
        formatList = formatList.slice(3, formatList.length - 9);
        return formatList;
    });
    // [{code:, name:}]
    let provinceArr = {};
    // {p_code:[code:, name:]}
    let cityArr = {};
    // {c_code:[code:, name:]}
    let districtArr = {};
    let isLoop = false
    urbanArr.forEach(el => {
        let curSel = el.split('\t')
        let code = curSel[0].trim()
        let name = curSel[1].trim()
        if(code.substr(2, 4) == "0000"){
            if(isLoop) isLoop = false
            if(typeof provinceArr[code] == "undefined") provinceArr[code] = {}
            provinceArr[code] = {"code": code, "name": name}
        }else if(code.substr(4, 2) == "00"){
            let c_code = code.substr(0,2) + "0000"
            if(typeof cityArr[c_code] == "undefined") cityArr[c_code] = []
            cityArr[c_code].push({"code": code, "name": name})
        }else{
            if(typeof cityArr[code.substr(0,2) + "0000"] == 'undefined' || isLoop) {
                let d_code = code.substr(0,2) + "0000"
                if(typeof districtArr[d_code] == "undefined") districtArr[d_code] = []
                districtArr[d_code].push({"code": code, "name": name})

                if(!isLoop){
                    isLoop = true
                    if(typeof cityArr[d_code] == "undefined") cityArr[d_code] = []
                    cityArr[d_code].push({"code": d_code, "name": provinceArr[d_code].name})
                }
            }else{
                let d_code = code.substr(0,4) + "00"
                if(typeof districtArr[d_code] == "undefined") districtArr[d_code] = []
                districtArr[d_code].push({"code": code, "name": name})
            }
        }
    })
    
    fs.writeFileSync(path.resolve(__dirname, "provinces.js"), `${JSON.stringify(provinceArr)}`);
    fs.writeFileSync(path.resolve(__dirname, "cities.js"), `${JSON.stringify(cityArr)}`);
    fs.writeFileSync(path.resolve(__dirname, "districts.js"), `${JSON.stringify(districtArr)}`);

    spinner.succeed(chalk.green("结束了"));

    await browser.close();
});

// 省市区

(async () => {
    let provinces = fs.readFileSync(path.resolve(__dirname, "provinces.js"));
    let cities = fs.readFileSync(path.resolve(__dirname, "cities.js"));
    let districts = fs.readFileSync(path.resolve(__dirname, "districts.js"));

    provinces = JSON.parse(provinces)
    cities = JSON.parse(cities)
    districts = JSON.parse(districts)

    let urbans = {}
    for(el in provinces){
        let p_code = el
        let p_name = provinces[el].name
        let curCity = cities[el]
        if(el == "710000" || el == "810000" || el == "820000"){
            if(typeof urbans[p_name] == 'undefined'){
                urbans[p_name] = {}
            }
            if(typeof urbans[p_name][p_name] == 'undefined'){
                urbans[p_name][p_name] = []
            }
            urbans[p_name][p_name].push(p_name)
        }else{
            curCity.forEach( eel => {
                let c_code = eel.code
                let c_name = eel.name
                let curDistrict
                if(typeof districts[c_code] == 'undefined') {
                    curDistrict = districts[p_code]
                    if(typeof urbans[p_name] == 'undefined'){
                        urbans[p_name] = {}
                    }
                    if(typeof urbans[p_name][c_name] == 'undefined'){
                        urbans[p_name][c_name] = []
                    }
                    urbans[p_name][c_name].push(c_name)
                }else{
                    curDistrict = districts[c_code]
                    curDistrict.forEach(eeel => {
                        let d_name = eeel.name
                        if(typeof urbans[p_name] == 'undefined'){
                            urbans[p_name] = {}
                        }
                        if(typeof urbans[p_name][c_name] == 'undefined'){
                            urbans[p_name][c_name] = []
                        }
                        urbans[p_name][c_name].push(d_name)
                    })
                }
            })
        }
    }
    fs.writeFileSync(path.resolve(__dirname, "areas.js"), `${JSON.stringify(urbans)}`);
})();
