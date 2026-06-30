#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Balance(Address),
}

#[contract]
pub struct TestContract;

#[contractimpl]
impl TestContract {
    /// Initializes the contract with an administrator address
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("contract is already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);

        // Emit an event representing initialization
        // Topics: (Symbol("init"), admin_address)
        // Data: Symbol("success")
        env.events().publish(
            (symbol_short!("init"), admin),
            symbol_short!("success")
        );
    }

    /// Deposits tokens from a user to the contract and updates persistent ledger storage balances
    pub fn deposit(env: Env, from: Address, token: Address, amount: i128) {
        from.require_auth();

        // 1. Token Interaction: Call the external token contract to transfer funds to this contract
        let client = soroban_sdk::token::Client::new(&env, &token);
        let contract_address = env.current_contract_address();
        client.transfer(&from, &contract_address, &amount);

        // 2. Storage Interaction: Update the local balance in persistent storage
        let key = DataKey::Balance(from.clone());
        let current_balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        let new_balance = current_balance + amount;
        env.storage().persistent().set(&key, &new_balance);

        // 3. Event Interaction: Publish a deposit event for indexing
        // Topics: (Symbol("deposit"), user_address)
        // Data: (token_address, amount)
        env.events().publish(
            (Symbol::new(&env, "deposit"), from),
            (token, amount)
        );
    }

    /// Queries the contract's persistent storage to retrieve the balance of a user
    pub fn get_balance(env: Env, user: Address) -> i128 {
        let key = DataKey::Balance(user);
        env.storage().persistent().get(&key).unwrap_or(0)
    }
}
