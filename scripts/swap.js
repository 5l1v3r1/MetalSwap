require("dotenv/config");
const { ethers } = require("ethers");
const parseArgs = require("minimist");
const { confirm } = require("./common/confirm");
const { txhandler } = require("./common/txhandler");
const PANCAKE = require("../abi/IPancakeRouter01.json");
const ERC20 = require("@openzeppelin/contracts/build/contracts/ERC20.json");

const PARAMETERS = Object.freeze([
  ["amount", ["amount", "a"]],
  ["sell", ["sell", "s"]],
  ["get", ["get", "g"]],
  ["delay", ["delay", "d"]],
]);

async function main() {
  const argv = parseArgs(process.argv.slice(2), {
    string: ["amount", "a", "sell", "s", "get", "g", "delay", "d"],
  });

  const paramsCheck = PARAMETERS.every(parameterTuple => {
    const [_name, [long, short]] = parameterTuple;
    return long in argv || short in argv;
  });

  if (!paramsCheck) {
    console.log(`
      Missing mandatory parameters!\n

      Help:\n

        --amount            -n : Amount to sell\n

        --sell              -s : Token to sell\n
    
        --get               -g : Token to get\n

        --delay             -d : Time delay in seconds between calls\n
    `);

    return;
  }

  const parameters = {};

  PARAMETERS.forEach(param => {
    const [name, [long, short]] = param;
    parameters[name] = argv[long] || argv[short];
  });

  const key = process.env.PRIVATE_KEY;
  const amount = parameters.amount;
  const delay = parameters.delay;
  const token0Address = parameters.sell;
  const token1Address = parameters.get;
  const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

  const url = 'https://bsc-dataseed.binance.org/';
  const provider = new ethers.providers.JsonRpcProvider(url);
  const signer = new ethers.Wallet(key, provider);
  const address = await signer.getAddress();
  console.log("Address:", address);

  const router = new ethers.Contract(routerAddress, PANCAKE, signer);

  const token0 = new ethers.Contract(token0Address, ERC20.abi, signer);
  const name0 = await token0.name();
  const decimals = await token0.decimals();
  const parsedAmount = ethers.utils.parseUnits(amount, decimals);

  const token1 = new ethers.Contract(token1Address, ERC20.abi, signer);
  const name1 = await token1.name();

  const path = [
    token0Address, // give
    token1Address, // get
  ];

  console.log(`Trying to swap ${name0} for ${name1} with a delay of ${delay/1000} seconds between retries`);

  let quote;
  let deadline;
  let slippage;

  while(1) {
    try {
      quote = await router.getAmountsOut(parsedAmount, path);
      
      deadline = Math.floor(Date.now() / 1000) + 60 * 5; // 5 mins
      slippage = (quote[1].sub(quote[1].mul(10).div(100))); // 10% slippage

      await router.callStatic.swapExactTokensForETH(
        parsedAmount,
        slippage,
        path,
        address,
        deadline,
        { gasLimit: 10000000 }
      );

      await router.swapExactTokensForETH(
        parsedAmount,
        slippage,
        path,
        address,
        deadline,
        { gasLimit: 10000000 }
      );

      console.log("Done");
      return;
    } catch (e) {
      if(e.reason != "TransferHelper: TRANSFER_FROM_FAILED") {
        console.log("Weird")
        console.log(e)
      } else {
        console.log(new Date().toLocaleString() + " " + e.reason);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
