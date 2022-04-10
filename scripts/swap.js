require("dotenv/config");
const { ethers } = require("ethers");
const PANCAKE = require("../abi/IPancakeRouter01.json");
const ERC20 = require("@openzeppelin/contracts/build/contracts/ERC20.json");

async function main() {


  const key = process.env.PRIVATE_KEY;
  const url = 'https://bsc-dataseed.binance.org/';
  const provider = new ethers.providers.JsonRpcProvider(url);
  const signer = new ethers.Wallet(key, provider);
  const address = await signer.getAddress();
  console.log("Address:", address);

  const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
  const metalAddress = "0x8995f63d98aADDaC79afC92025431b0f50633DDA";
  const bnbAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

  const router = new ethers.Contract(routerAddress, PANCAKE, signer);
  const metal = new ethers.Contract(metalAddress, ERC20.abi, signer);
  const decimals = await metal.decimals();

  const amountToBuy = ethers.utils.parseUnits("200.0", decimals);
  const amountToSell = ethers.utils.parseUnits("250.0", decimals);

  console.log("amountToBuy", amountToBuy.toString());
  console.log("amountToSell", amountToSell.toString());

  const buyPath = [
    bnbAddress,
    metalAddress,

  ];
  const sellPath = [
    metalAddress,
    bnbAddress,
  ];

  let quote;
  let deadline;
  let slippage;

  // buy 200
  deadline = Math.floor(Date.now() / 1000) + 60 * 5; // 5 mins
  quote = await router.getAmountsIn(amountToBuy, buyPath);
  slippage = (quote[1].sub(quote[1].mul(1).div(100))); // 1% slippage

  const buyTx = await router.swapETHForExactTokens(
    slippage,
    buyPath,
    address,
    deadline,
    {
      gasLimit: 1000000,
      value: quote[0]
    }
  );

  await buyTx.wait();

  console.log("Buy OK");

  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    // sell 250
    deadline = Math.floor(Date.now() / 1000) + 60 * 5; // 5 mins
    quote = await router.getAmountsOut(amountToSell, sellPath);
    slippage = (quote[1].sub(quote[1].mul(1).div(100))); // 1% slippage

    let sellTx = await router.swapExactTokensForETH(
      amountToSell,
      slippage,
      sellPath,
      address,
      deadline,
      {
        gasLimit: 1000000,
      }
    );

    await sellTx.wait();

    console.log("Sell OK");
  } catch(e) {
    console.log("Sell NOT OK");

    const newAmountToSell = ethers.utils.parseUnits("200.0", decimals);

    deadline = Math.floor(Date.now() / 1000) + 60 * 5; // 5 mins
    quote = await router.getAmountsOut(newAmountToSell, sellPath);
    slippage = (quote[1].sub(quote[1].mul(1).div(100))); // 1% slippage

    let sellTx = await router.swapExactTokensForETH(
      newAmountToSell,
      slippage,
      sellPath,
      address,
      deadline,
      {
        gasLimit: 1000000,
      }
    );

    await sellTx.wait();
    console.log("Sell MAYBE OK");
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
