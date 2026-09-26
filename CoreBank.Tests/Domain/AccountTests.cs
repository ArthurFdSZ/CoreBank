using CoreBank.Domain.Entities;
using CoreBank.Domain.Exceptions;

namespace CoreBank.Tests.Domain;

// Testes das principais regras da conta bancária.
public class AccountTests
{
    [Fact]
    public void Deposit_ShouldIncreaseBalance_WhenAmountIsValid()
    {
        var account = new Account();

        account.Deposit(500m);

        Assert.Equal(500m, account.Balance);
    }

    [Fact]
    public void Deposit_ShouldThrowException_WhenAmountIsInvalid()
    {
        var account = new Account();

        Assert.Throws<DomainException>(() => account.Deposit(0m));
    }

    [Fact]
    public void Withdraw_ShouldDecreaseBalance_WhenBalanceIsEnough()
    {
        var account = new Account();
        account.Deposit(1000m);

        account.Withdraw(300m);

        Assert.Equal(700m, account.Balance);
    }

    [Fact]
    public void Withdraw_ShouldThrowException_WhenBalanceIsInsufficient()
    {
        var account = new Account();
        account.Deposit(100m);

        Assert.Throws<DomainException>(() => account.Withdraw(200m));
    }

    [Fact]
    public void Transfer_ShouldMoveMoneyBetweenAccounts_WhenValid()
    {
        var sourceAccount = new Account { Id = 1 };
        var destinationAccount = new Account { Id = 2 };

        sourceAccount.Deposit(1000m);

        sourceAccount.TransferTo(destinationAccount, 300m);

        Assert.Equal(700m, sourceAccount.Balance);
        Assert.Equal(300m, destinationAccount.Balance);
    }

    [Fact]
    public void Transfer_ShouldThrowException_WhenDestinationIsSameAccount()
    {
        var account = new Account { Id = 1 };
        account.Deposit(500m);

        Assert.Throws<DomainException>(
            () => account.TransferTo(account, 100m));
    }

    [Fact]
    public void BlockedAccount_ShouldNotAllowWithdraw()
    {
        var account = new Account();
        account.Deposit(500m);
        account.Block();

        Assert.Throws<DomainException>(() => account.Withdraw(100m));
    }

    [Fact]
    public void UnblockedAccount_ShouldAllowOperations()
    {
        var account = new Account();
        account.Block();
        account.Unblock();

        account.Deposit(200m);

        Assert.Equal(200m, account.Balance);
    }
}