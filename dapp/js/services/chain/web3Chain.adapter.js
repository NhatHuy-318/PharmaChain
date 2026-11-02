/**
 * Web3 Chain Adapter
 * Kết nối tương tác trực tiếp với smart contract BatchRegistry qua Web3.js và MetaMask
 * (Được hoàn thiện đầy đủ tại Giai đoạn 5)
 */

import { IChainAdapter } from './chain.interface.js';
import { CONTRACT_CONFIG, loadContractAbi } from '../../config/contract.js';

export class Web3ChainAdapter extends IChainAdapter {
  constructor() {
    super();
    this.contract = null;
    this.web3 = null;
  }

  async _ensureContract() {
    if (this.contract) return this.contract;
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask chưa được cài đặt để gọi Web3.');
    }
    const Web3Lib = window.Web3 || (await import('web3')).Web3;
    this.web3 = new Web3Lib(window.ethereum);
    const abi = await loadContractAbi();
    this.contract = new this.web3.eth.Contract(abi, CONTRACT_CONFIG.address);
    return this.contract;
  }

  async grantRole(account, role, orgName, licenseHash) {
    const c = await this._ensureContract();
    const from = (await this.web3.eth.getAccounts())[0];
    return c.methods.grantRole(account, role, orgName, licenseHash).send({ from });
  }

  async revokeRole(account) {
    const c = await this._ensureContract();
    const from = (await this.web3.eth.getAccounts())[0];
    return c.methods.revokeRole(account).send({ from });
  }

  async registerBatch(batchNo, materialName, mfgDate, expiryDate, storageConditions, importer, docHash) {
    const c = await this._ensureContract();
    const from = (await this.web3.eth.getAccounts())[0];
    const receipt = await c.methods.registerBatch(batchNo, materialName, mfgDate, expiryDate, storageConditions, importer, docHash).send({ from });
    return receipt.events?.BatchRegistered?.returnValues?.batchId;
  }

  async recordTestResult(batchId, passed, reportNo, testDate, docHash) {
    const c = await this._ensureContract();
    const from = (await this.web3.eth.getAccounts())[0];
    return c.methods.recordTestResult(batchId, passed, reportNo, testDate, docHash).send({ from });
  }

  async recordImport(batchId, originCountry, customsDeclNo, importDate, docHash) {
    const c = await this._ensureContract();
    const from = (await this.web3.eth.getAccounts())[0];
    return c.methods.recordImport(batchId, originCountry, customsDeclNo, importDate, docHash).send({ from });
  }

  async initiateTransfer(batchId, receiver, docHash) {
    const c = await this._ensureContract();
    const from = (await this.web3.eth.getAccounts())[0];
    return c.methods.initiateTransfer(batchId, receiver, docHash).send({ from });
  }

  async confirmTransfer(batchId, docHash) {
    const c = await this._ensureContract();
    const from = (await this.web3.eth.getAccounts())[0];
    return c.methods.confirmTransfer(batchId, docHash).send({ from });
  }

  async cancelTransfer(batchId, docHash) {
    const c = await this._ensureContract();
    const from = (await this.web3.eth.getAccounts())[0];
    return c.methods.cancelTransfer(batchId, docHash).send({ from });
  }

  async recordReceivingInspection(batchId, passed, reportNo, inspectDate, docHash) {
    const c = await this._ensureContract();
    const from = (await this.web3.eth.getAccounts())[0];
    return c.methods.recordReceivingInspection(batchId, passed, reportNo, inspectDate, docHash).send({ from });
  }

  async getRole(account) {
    const c = await this._ensureContract();
    return c.methods.getRole(account).call();
  }

  async getBatch(batchId) {
    const c = await this._ensureContract();
    return c.methods.getBatch(batchId).call();
  }

  async getBatchCount() {
    const c = await this._ensureContract();
    return c.methods.getBatchCount().call();
  }

  async getBatches(fromId, count) {
    const c = await this._ensureContract();
    return c.methods.getBatches(fromId, count).call();
  }

  async getBatchIdByNo(batchNo) {
    const c = await this._ensureContract();
    return c.methods.getBatchIdByNo(batchNo).call();
  }

  async isExpired(batchId) {
    const c = await this._ensureContract();
    return c.methods.isExpired(batchId).call();
  }

  async getBatchEvents(batchId) {
    const c = await this._ensureContract();
    const events = await c.getPastEvents('allEvents', {
      filter: { batchId },
      fromBlock: 0,
      toBlock: 'latest',
    });
    return events;
  }

  async searchEventsByDocHash(docHash) {
    const c = await this._ensureContract();
    const events = await c.getPastEvents('allEvents', {
      filter: { docHash },
      fromBlock: 0,
      toBlock: 'latest',
    });
    return events;
  }
}

export const web3ChainAdapter = new Web3ChainAdapter();

