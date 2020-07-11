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
    let provinces = [];
    // {p_code:[code:, name:]}
    let cities = {};
    // {c_code:[code:, name:]}
    let district = {};
    let curCities = [];
    let curDistrict = [];
    let isSpecial = false;
    let provinceFlag = "99", cityFlag = "9999"; 
    urbanArr.forEach(el => {
        let curSel = el.split('\t');
        let code = curSel[0].trim()
        let name = curSel[1].trim()
        if(provinceFlag != code.substr(0,2)){
            if(isSpecial){
                district[cityFlag + "00"] = curDistrict
                curDistrict = []
                isSpecial = false
            }
            if(Object.keys(provinces).length != 0){
                if(curCities.length != 0){
                    cities[provinceFlag + "0000"] = curCities
                    curCities = []
                }else{
                    if(code != "710000" && code != "810000" && code != "820000")
                    cities[provinceFlag + "0000"] = [{"code":provinces[provinces.length - 1].code, "name": provinces[provinces.length - 1].name}]
                }
            }
            provinces.push({"code": code, "name": name})
            provinceFlag = code.substr(0, 2)
        }else{
            if(cityFlag != code.substr(0,4)){
                if(Object.keys(cities).length != 0 ){
                    if("00" == code.substr(4,2)){
                        // 市
                        if(typeof district[cityFlag + "00"] === 'undefined'){
                            district[cityFlag + "00"] = curDistrict
                            curDistrict = []
                        }
                        curCities.push({"code": code, "name": name})
                    }else{
                        isSpecial = true
                        // 县
                        curDistrict.push({"code": code, "name": name})
                    }
                }else{
                    isSpecial = true
                    // 初次 
                    // 县
                    curDistrict.push({"code": code, "name": name})
                }
            }else{
                curDistrict.push({"code": code, "name": name})
            }
            cityFlag = code.substr(0, 4)
        }
    })
    
    fs.writeFileSync(path.resolve(__dirname, "provinces.js"), `${JSON.stringify(provinces)}`);
    fs.writeFileSync(path.resolve(__dirname, "cities.js"), `${JSON.stringify(cities)}`);
    fs.writeFileSync(path.resolve(__dirname, "districts.js"), `${JSON.stringify(district)}`);

    spinner.succeed(chalk.green("结束了"));

    await browser.close();
})();

// 省市区

(async () => {
});
