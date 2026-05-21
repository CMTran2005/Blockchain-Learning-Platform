import { Contract } from 'ethers';
import CourseAbi from './CourseAbi.json';

// YOU NEED TO REPLACE THIS AFTER DEPLOYING ON GANACHE
export const CONTRACT_ADDRESS = "0x0D0b8deF35B0C669b589f6f000349c879e015b1C"; 

export const getContract = (signer) => {
    return new Contract(CONTRACT_ADDRESS, CourseAbi.abi, signer);
};