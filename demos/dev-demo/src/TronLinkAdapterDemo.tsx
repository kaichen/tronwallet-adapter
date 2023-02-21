import type { ReactNode } from 'react';
import { useEffect, useMemo, useState, useCallback } from 'react';
// import './App.css';
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapters';
import type { Adapter } from '@tronweb3/tronwallet-abstract-adapter';
import { AdapterState } from '@tronweb3/tronwallet-abstract-adapter';
import { Box, Button, Typography, Tooltip, Select, MenuItem, Alert, FormControl, TextField } from '@mui/material';
import { tronWeb } from './tronweb.js';
const receiver = 'TMDKznuDWaZwfZHcM61FVFstyYNmK6Njk1';

export function TronLinkAdapterDemo() {
    const [connectState, setConnectState] = useState(AdapterState.NotFound);
    const [account, setAccount] = useState('');
    const [chainId, setChainId] = useState<string>('');
    const [selectedChainId, setSelectedChainId] = useState('0xcd8690dc');
    const [open, setOpen] = useState(false);
    const adapter = useMemo(() => new TronLinkAdapter(), []);

    useEffect(() => {
        setConnectState(adapter.state);
        setAccount(adapter.address || '');

        adapter.on('connect', () => {
            console.log('---connect', adapter.address);
            setAccount(adapter.address || '');
        });
        adapter.on('stateChanged', (state) => {
            console.log('---state change', state);
            setConnectState(state);
        });
        adapter.on('accountsChanged', (data) => {
            console.log('---account changed', data);
            setAccount(data as string);
        });

        adapter.on('chainChanged', (data) => {
            console.log('---chain changed', data);
            setChainId((data as any).chainId);
        });

        adapter.on('disconnect', () => {
            console.log('---disconnect');
        });

        return () => {
            adapter.removeAllListeners();
        };
    }, [adapter]);

    function onSwitchChain() {
        adapter.switchChain(selectedChainId);
    }

    async function onSignTransaction() {
        const tronWeb = (window.tron as any).tronWeb as any;
        const transaction = await tronWeb.transactionBuilder.sendTrx(receiver, tronWeb.toSun(0.1), adapter.address);
        const signedTransaction = await adapter.signTransaction(transaction);
        // const signedTransaction = await tronWeb.trx.sign(transaction);
        const res = await tronWeb.trx.sendRawTransaction(signedTransaction);
        setOpen(true);
    }

    return (
        <Box sx={{ width: '100%', maxWidth: 900 }}>
            <h1>TronLink Demo</h1>
            <Typography variant="h6" gutterBottom>
                Your account address:
            </Typography>
            <Detail>{account}</Detail>

            <Typography variant="h6" gutterBottom>
                Current network you choose: {chainId}
            </Typography>

            <Typography variant="h6" gutterBottom>
                Current connection status:&nbsp;&nbsp;
                <span style={{ color: adapter?.connected ? '#08f108' : 'orange' }}>{connectState}</span>
            </Typography>
            <Detail>
                <Button variant="contained" disabled={adapter?.connected} onClick={() => adapter?.connect()}>
                    Connect
                </Button>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Button variant="contained" disabled={!adapter?.connected} onClick={() => adapter?.disconnect()}>
                    Disconnect
                </Button>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Button variant="contained" disabled={!adapter?.connected} onClick={onSignTransaction}>
                    Transfer
                </Button>
            </Detail>
            {open && (
                <Alert onClose={() => setOpen(false)} severity="success" sx={{ width: '100%', marginTop: 1 }}>
                    Success! You can confirm your transfer on{' '}
                    <a target="_blank" rel="noreferrer" href={`https://nile.tronscan.org/#/address/${adapter.address}`}>
                        Tron Scan
                    </a>
                </Alert>
            )}
            <Typography variant="h6" gutterBottom>
                You can switch chain by click the button.
            </Typography>
            <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={selectedChainId}
                label="Chain"
                size="small"
                onChange={(e) => setSelectedChainId(e.target.value)}
            >
                <MenuItem value={'0x2b6653dc'}>Mainnet</MenuItem>
                <MenuItem value={'0x94a9059e'}>Shasta</MenuItem>
                <MenuItem value={'0xcd8690dc'}>Nile</MenuItem>
            </Select>

            <Button style={{ margin: '0 20px' }} onClick={onSwitchChain} variant="contained">
                Switch Chain to {selectedChainId}
            </Button>
            <MultiSignDemo address={account} adapter={adapter}></MultiSignDemo>
        </Box>
    );
}

function Detail(props: { children: ReactNode }) {
    return (
        <Typography sx={{ ml: 4 }} variant="body1" gutterBottom>
            {props.children}
        </Typography>
    );
}

function MultiSignDemo(props: { address: string; adapter: Adapter }) {
    const [address1, setAddress1] = useState('');
    const [open, setOpen] = useState(false);

    async function onApprove() {
        const ownerAddress = tronWeb.address.toHex(props.address);
        const ownerPermission = {
            type: 0,
            permission_name: 'owner',
            threshold: 1,
            keys: [
                {
                    address: ownerAddress,
                    weight: 1,
                },
            ],
        };
        const activePermission = {
            type: 2,
            permission_name: 'ActivePermission',
            threshold: 2,
            keys: [],
            operations: '7fff1fc0037e0000000000000000000000000000000000000000000000000000',
        } as any;

        activePermission.keys.push({ address: ownerAddress, weight: 1 });
        activePermission.keys.push({ address: tronWeb.address.toHex(address1), weight: 1 });

        const updateTransaction = await tronWeb.transactionBuilder.updateAccountPermissions(ownerAddress, ownerPermission, null, [activePermission]);
        const signed = await props.adapter.signTransaction(updateTransaction);
        const res = await tronWeb.trx.sendRawTransaction(signed);
        alert('update successfully.');
    }

    const [transferTransaction, setTransferTransaction] = useState(null);
    const [canSend, setCanSend] = useState(false);

    const multiSignWithAddress1 = useCallback(
        async function () {
            const tronWeb = (window.tron as any).tronWeb as any;
            const transaction = await tronWeb.transactionBuilder.sendTrx(receiver, tronWeb.toSun(0.1), props.address, { permissionId: 2 });
            const signedTransaction = await props.adapter.multiSign(transaction, null, 2);
            setTransferTransaction(signedTransaction);
        },
        [props.adapter, setTransferTransaction, props.address]
    );
    const multiSignWithAddress2 = useCallback(
        async function () {
            console.log('first multi signed tx:', transferTransaction);
            const signedTransaction = await props.adapter.multiSign(transferTransaction as any, null, 2);
            console.log('second multi signed tx:', signedTransaction);
            setTransferTransaction(signedTransaction);
            const signWeight = await tronWeb.trx.getSignWeight(signedTransaction, 2);
            console.log('signWeight: ', signWeight);
            if (signWeight.current_weight >= 2) {
                setCanSend(true);
            }
        },
        [transferTransaction, setTransferTransaction, setCanSend, props.adapter]
    );
    async function broadcast() {
        const res = await tronWeb.trx.broadcast(transferTransaction);
        setOpen(true);
    }
    return (
        <>
            <h3>MultiSign Demo</h3>
            {/* <p>You can input two address and click approve button to give them permission.</p>
            <div>
                <TextField size="small" label="address to approve" value={address1} onChange={(e) => setAddress1(e.target.value)}></TextField>
                <Button style={{ marginLeft: 10 }} disabled={!address1} variant="contained" onClick={onApprove}>
                    Approve
                </Button>
            </div> */}

            <p>You can click following buttons to multiSign and send the Transaction</p>
            <div>
                <Button disabled={!props.address} variant="contained" onClick={multiSignWithAddress1}>
                    Sign with 1st Address
                </Button>
                <Button disabled={!transferTransaction} style={{ marginLeft: 10 }} variant="contained" onClick={multiSignWithAddress2}>
                    Sign with 2nd Address
                </Button>
                <Button style={{ marginLeft: 10 }} variant="contained" onClick={broadcast}>
                    Send the transaction
                </Button>
            </div>
            {open && (
                <Alert onClose={() => setOpen(false)} severity="success" sx={{ width: '100%', marginTop: 1 }}>
                    Success! You can confirm your transfer on{' '}
                    <a target="_blank" rel="noreferrer" href={`https://nile.tronscan.org/#/address/${props.address}`}>
                        Tron Scan
                    </a>
                </Alert>
            )}
        </>
    );
}